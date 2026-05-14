CREATE OR REPLACE VIEW api.v_recap_pluie_bv_journalier AS
WITH barrage_ref AS (
    SELECT
        s.station_id,
        s.name AS barrage
    FROM geo.station s
    WHERE lower(coalesce(s.station_type, '')) LIKE '%barrage%'
),
barrage_basin_map AS (
    SELECT 'wahda'::text AS barrage_key, 'al wahda 1'::text AS dgm_basin_name
    UNION ALL SELECT 'wahda', 'al wahda 2'
    UNION ALL SELECT 'wahda', 'al wahda 3'
    UNION ALL SELECT 'idriss', 'idriss 1er'
    UNION ALL SELECT 'ouljet', 'ouljet soltane'
),
target_barrages AS (
    SELECT
        r.station_id::text AS barrage_id,
        r.barrage,
        CASE
            WHEN lower(r.barrage) LIKE '%wahda%' THEN 'wahda'
            WHEN lower(r.barrage) LIKE '%idriss%' THEN 'idriss'
            WHEN lower(r.barrage) LIKE '%ouljet%' OR lower(r.barrage) LIKE '%soltan%' OR lower(r.barrage) LIKE '%soulta%' THEN 'ouljet'
            ELSE NULL
        END AS barrage_key
    FROM barrage_ref r
),
resolved_basin_map AS (
    SELECT
        m.barrage_key,
        m.dgm_basin_name,
        COALESCE(b_by_name.basin_id, b_by_station.basin_id) AS basin_id
    FROM barrage_basin_map m
    LEFT JOIN LATERAL (
        SELECT b.basin_id
        FROM geo.basin b
        WHERE lower(b.name) = lower(m.dgm_basin_name)
        LIMIT 1
    ) b_by_name ON TRUE
    LEFT JOIN LATERAL (
        SELECT s.basin_id
        FROM geo.station s
        WHERE s.basin_id IS NOT NULL
          AND (
              lower(s.name) = lower(m.dgm_basin_name)
              OR lower(s.name) LIKE '%' || lower(m.dgm_basin_name) || '%'
              OR lower(m.dgm_basin_name) LIKE '%' || lower(s.name) || '%'
              OR (m.barrage_key = 'wahda' AND lower(s.name) LIKE '%wahda%')
              OR (m.barrage_key = 'idriss' AND lower(s.name) LIKE '%idriss%')
              OR (m.barrage_key = 'ouljet' AND (lower(s.name) LIKE '%ouljet%' OR lower(s.name) LIKE '%soltan%' OR lower(s.name) LIKE '%soultan%'))
          )
        ORDER BY
            CASE
                WHEN lower(s.name) = lower(m.dgm_basin_name) THEN 1
                WHEN lower(s.name) LIKE '%' || lower(m.dgm_basin_name) || '%' THEN 2
                WHEN m.barrage_key = 'wahda' AND lower(s.name) LIKE '%wahda%' THEN 3
                WHEN m.barrage_key = 'idriss' AND lower(s.name) LIKE '%idriss%' THEN 3
                WHEN m.barrage_key = 'ouljet' AND (lower(s.name) LIKE '%ouljet%' OR lower(s.name) LIKE '%soltan%' OR lower(s.name) LIKE '%soultan%') THEN 3
                ELSE 4
            END,
            s.station_id
        LIMIT 1
    ) b_by_station ON TRUE
),
mapped_barrage_basins AS (
    SELECT DISTINCT
        t.barrage_id,
        t.barrage,
        r.basin_id
    FROM target_barrages t
    JOIN resolved_basin_map r ON r.barrage_key = t.barrage_key
    WHERE t.barrage_key IS NOT NULL
      AND r.basin_id IS NOT NULL
),
daily_basin AS (
    SELECT
        date_trunc('day', (bm.time AT TIME ZONE 'UTC'))::date AS jour,
        bm.basin_id,
        SUM(bm.value::double precision) AS basin_daily_cumul_mm
    FROM ts.basin_measurement bm
    JOIN ref.variable v ON v.variable_id = bm.variable_id
    JOIN ref.source s ON s.source_id = bm.source_id
    WHERE v.code = 'precip_mm'
      AND s.code = 'ECMWF'
    GROUP BY date_trunc('day', (bm.time AT TIME ZONE 'UTC'))::date, bm.basin_id
)
SELECT
    d.jour,
    m.barrage_id,
    SUM(d.basin_daily_cumul_mm)::double precision AS pluie_moy_mm,
    m.barrage
FROM mapped_barrage_basins m
JOIN daily_basin d ON d.basin_id = m.basin_id
GROUP BY d.jour, m.barrage_id, m.barrage;
CREATE OR REPLACE VIEW api.v_recap_barrage_journalier AS
WITH barrage_ref AS (
    SELECT
        s.station_id,
        s.name AS barrage,
        COALESCE(b.name, '-') AS bassin,
        CASE
            WHEN lower(s.name) LIKE '%idriss%' THEN 1125::double precision
            WHEN lower(s.name) LIKE '%wahda%' THEN 3523::double precision
            WHEN lower(s.name) LIKE '%ouljet%' OR lower(s.name) LIKE '%soltane%' OR lower(s.name) LIKE '%soultane%' THEN 508::double precision
            ELSE NULL::double precision
        END AS capacite_mm3
    FROM geo.station s
    LEFT JOIN geo.basin b ON b.basin_id = s.basin_id
    WHERE lower(coalesce(s.station_type, '')) LIKE '%barrage%'
),
sim_retenue_8h AS (
    SELECT
        sub.barrage_id,
        sub.jour,
        sub.value AS retenue_sim_8h_mm3
    FROM (
        SELECT
            m.station_id::text AS barrage_id,
            date_trunc('day', (m.time AT TIME ZONE 'UTC'))::date AS jour,
            m.value::double precision AS value,
            row_number() OVER (
                PARTITION BY m.station_id::text, date_trunc('day', (m.time AT TIME ZONE 'UTC'))::date
                ORDER BY
                    abs(
                        extract(
                            epoch
                            FROM (
                                (m.time AT TIME ZONE 'UTC') - (date_trunc('day', (m.time AT TIME ZONE 'UTC')) + interval '8 hour')
                            )
                        )
                    ),
                    m.time DESC
            ) AS rn
        FROM ts.measurement m
        JOIN ref.variable v ON v.variable_id = m.variable_id
        JOIN ref.source src ON src.source_id = m.source_id
        JOIN barrage_ref r ON r.station_id = m.station_id
        WHERE v.code = 'volume_hm3'
          AND src.code = 'SIM'
    ) sub
    WHERE sub.rn = 1
),
sim_volume_8h AS (
    SELECT
        sub.barrage_id,
        sub.jour,
        sub.value AS volume_sim_8h_mm3
    FROM (
        SELECT
            m.station_id::text AS barrage_id,
            date_trunc('day', (m.time AT TIME ZONE 'UTC'))::date AS jour,
            m.value::double precision AS value,
            row_number() OVER (
                PARTITION BY m.station_id::text, date_trunc('day', (m.time AT TIME ZONE 'UTC'))::date
                ORDER BY
                    abs(
                        extract(
                            epoch
                            FROM (
                                (m.time AT TIME ZONE 'UTC') - (date_trunc('day', (m.time AT TIME ZONE 'UTC')) + interval '8 hour')
                            )
                        )
                    ),
                    m.time DESC
            ) AS rn
        FROM ts.measurement m
        JOIN ref.variable v ON v.variable_id = m.variable_id
        JOIN ref.source src ON src.source_id = m.source_id
        JOIN barrage_ref r ON r.station_id = m.station_id
        WHERE v.code = 'volume_hm3'
          AND src.code = 'SIM'
    ) sub
    WHERE sub.rn = 1
),
daily_agg AS (
    SELECT
        date_trunc('day', (m.time AT TIME ZONE 'UTC'))::date AS jour,
        r.station_id::text AS barrage_id,
        r.barrage,
        r.bassin,
        r.capacite_mm3,
        SUM(CASE WHEN v.code = 'inflow_m3s' AND src.code = 'SIM'
            THEN m.value::double precision * 3600 / 1000000 END) AS apports_mm3,
        SUM(CASE WHEN v.code = 'lacher_m3s' AND src.code = 'SIM'
            THEN m.value::double precision * 3600 / 1000000 END) AS lacher_mm3,
        MAX(CASE WHEN v.code = 'flow_m3s' AND src.code = 'SIM'
            THEN m.value::double precision END) AS debit_max_m3s,
        AVG(CASE WHEN v.code = 'flow_m3s' AND src.code = 'SIM'
            THEN m.value::double precision END) AS debit_moy_m3s
    FROM barrage_ref r
    LEFT JOIN ts.measurement m ON m.station_id = r.station_id
    LEFT JOIN ref.variable v ON v.variable_id = m.variable_id
    LEFT JOIN ref.source src ON src.source_id = m.source_id
    GROUP BY date_trunc('day', (m.time AT TIME ZONE 'UTC'))::date, r.station_id::text, r.barrage, r.bassin, r.capacite_mm3
)
SELECT
    d.jour,
    d.barrage_id,
    d.barrage,
    d.bassin,
    p.pluie_moy_mm,
    rv.retenue_sim_8h_mm3,
    d.apports_mm3,
    sv.volume_sim_8h_mm3,
    CASE
        WHEN d.capacite_mm3 IS NULL OR sv.volume_sim_8h_mm3 IS NULL THEN NULL
        ELSE d.capacite_mm3 - sv.volume_sim_8h_mm3
    END AS creux_mm3,
    d.lacher_mm3,
    d.debit_max_m3s,
    d.debit_moy_m3s,
    d.capacite_mm3
FROM daily_agg d
LEFT JOIN api.v_recap_pluie_bv_journalier p
  ON p.barrage_id = d.barrage_id
 AND p.jour = d.jour
LEFT JOIN sim_retenue_8h rv
  ON rv.barrage_id = d.barrage_id
 AND rv.jour = d.jour
LEFT JOIN sim_volume_8h sv
  ON sv.barrage_id = d.barrage_id
 AND sv.jour = d.jour;

CREATE OR REPLACE VIEW api.v_recap_alerte_prevision AS
WITH barrage_ref AS (
    SELECT
        s.station_id,
        s.name AS barrage,
        COALESCE(b.name, '-') AS bassin,
        CASE
            WHEN lower(s.name) LIKE '%idriss%' THEN 1125::double precision
            WHEN lower(s.name) LIKE '%wahda%' THEN 3523::double precision
            WHEN lower(s.name) LIKE '%ouljet%' OR lower(s.name) LIKE '%soltane%' OR lower(s.name) LIKE '%soultane%' THEN 508::double precision
            ELSE NULL::double precision
        END AS capacite_mm3
    FROM geo.station s
    LEFT JOIN geo.basin b ON b.basin_id = s.basin_id
    WHERE lower(coalesce(s.station_type, '')) LIKE '%barrage%'
)
SELECT
    date_trunc('day', (m.time AT TIME ZONE 'UTC'))::date AS jour,
    r.station_id::text AS barrage_id,
    r.barrage,
    r.bassin,
    r.capacite_mm3,
    MAX(m.value::double precision) AS volume_prevu_mm3,
    CASE
        WHEN r.capacite_mm3 IS NULL THEN NULL
        ELSE r.capacite_mm3 - MAX(m.value::double precision)
    END AS creux_prevu_mm3
FROM barrage_ref r
JOIN ts.measurement m ON m.station_id = r.station_id
JOIN ref.variable v ON v.variable_id = m.variable_id
JOIN ref.source src ON src.source_id = m.source_id
WHERE v.code = 'volume_hm3'
  AND src.code = 'SIM'
GROUP BY date_trunc('day', (m.time AT TIME ZONE 'UTC'))::date, r.station_id::text, r.barrage, r.bassin, r.capacite_mm3;


