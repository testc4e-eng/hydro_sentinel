CREATE OR REPLACE VIEW api.v_recap_debit_journalier AS
SELECT
    date_trunc('day', m.time)::date AS jour,
    s.station_id::text              AS barrage_id,
    s.name                          AS barrage,
    COALESCE(
      MAX(CASE WHEN v.code = 'flow_m3s' AND src.code = 'OBS' THEN m.value::double precision END),
      MAX(CASE WHEN v.code = 'flow_m3s' AND src.code = 'SIM' THEN m.value::double precision END),
      MAX(CASE WHEN v.code = 'inflow_m3s' AND src.code = 'OBS' THEN m.value::double precision END),
      MAX(CASE WHEN v.code = 'inflow_m3s' AND src.code = 'SIM' THEN m.value::double precision END)
    ) AS debit_max_j,
    COALESCE(
      AVG(CASE WHEN v.code = 'flow_m3s' AND src.code = 'OBS' THEN m.value::double precision END),
      AVG(CASE WHEN v.code = 'flow_m3s' AND src.code = 'SIM' THEN m.value::double precision END),
      AVG(CASE WHEN v.code = 'inflow_m3s' AND src.code = 'OBS' THEN m.value::double precision END),
      AVG(CASE WHEN v.code = 'inflow_m3s' AND src.code = 'SIM' THEN m.value::double precision END)
    ) AS debit_moy_j,
    COALESCE(
      SUM(CASE WHEN v.code = 'lacher_m3s' AND src.code = 'OBS' THEN m.value::double precision * 3600 / 1000000 END),
      SUM(CASE WHEN v.code = 'lacher_m3s' AND src.code = 'SIM' THEN m.value::double precision * 3600 / 1000000 END)
    ) AS restitutions_mm3,
    COALESCE(
      MAX(CASE WHEN v.code = 'volume_hm3' AND src.code = 'OBS' AND EXTRACT(HOUR FROM m.time) = 8 THEN m.value::double precision END),
      MAX(CASE WHEN v.code = 'volume_hm3' AND src.code = 'SIM' AND EXTRACT(HOUR FROM m.time) = 8 THEN m.value::double precision END)
    ) AS retenue_8h_mm3,
    COALESCE(
      SUM(CASE WHEN v.code = 'inflow_m3s' AND src.code = 'OBS' THEN m.value::double precision * 3600 / 1000000 END),
      SUM(CASE WHEN v.code = 'inflow_m3s' AND src.code = 'SIM' THEN m.value::double precision * 3600 / 1000000 END)
    ) AS apports_mm3
FROM ts.measurement m
JOIN ref.variable v ON v.variable_id = m.variable_id
JOIN ref.source src ON src.source_id = m.source_id
JOIN geo.station s ON s.station_id = m.station_id
WHERE lower(coalesce(s.station_type, '')) LIKE '%barrage%'
  AND src.code IN ('OBS', 'SIM')
  AND v.code IN ('flow_m3s', 'inflow_m3s', 'lacher_m3s', 'volume_hm3')
GROUP BY date_trunc('day', m.time)::date, s.station_id::text, s.name;

CREATE OR REPLACE VIEW api.v_recap_apports_journalier AS
SELECT
    d.jour,
    d.barrage_id,
    d.barrage,
    d.retenue_8h_mm3,
    d.debit_max_j,
    d.debit_moy_j,
    d.restitutions_mm3,
    d.apports_mm3,
    GREATEST(
      (
          CASE
              WHEN lower(d.barrage) LIKE '%idriss%' THEN 1125::double precision
              WHEN lower(d.barrage) LIKE '%wahda%' THEN 3523::double precision
              WHEN lower(d.barrage) LIKE '%ouljet%' THEN 508::double precision
              ELSE NULL
          END
      ) - d.retenue_8h_mm3,
      0::double precision
    ) AS creux_mm3
FROM api.v_recap_debit_journalier d;

CREATE OR REPLACE VIEW api.v_recap_pluie_journalier AS
SELECT
    date_trunc('day', m.time)::date AS jour,
    b.station_id::text              AS barrage_id,
    AVG(m.value::double precision)  AS pluie_moy_dgm
FROM geo.station b
JOIN geo.station p
  ON p.basin_id = b.basin_id
 AND lower(coalesce(p.station_type, '')) NOT LIKE '%barrage%'
JOIN ts.measurement m ON m.station_id = p.station_id
JOIN ref.variable v ON v.variable_id = m.variable_id
JOIN ref.source src ON src.source_id = m.source_id
WHERE lower(coalesce(b.station_type, '')) LIKE '%barrage%'
  AND src.code = 'OBS'
  AND v.code = 'precip_mm'
GROUP BY date_trunc('day', m.time)::date, b.station_id::text;
