import csv
import os
from datetime import datetime

import psycopg2

DATABASE_URL = "postgresql://postgres:c4e@test@2025@localhost:5432/app_inondation_db"
OUTPUT_DIR = "."
TIMESTAMP = datetime.now().strftime("%Y-%m-%d")


def export_csv(conn, filename, query, headers):
    with conn.cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()

    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, delimiter=";")
        writer.writerow(headers)
        writer.writerows(rows)
    print(f"[OK] {filename} - {len(rows)} lignes")


def main():
    # Password contains '@', so use explicit parameters instead of DSN URL parsing.
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        dbname="app_inondation_db",
        user="postgres",
        password="c4e@test@2025",
    )
    try:
        # CSV 1 — Inventaire tables et vues
        export_csv(
            conn,
            "mapping_01_inventaire_tables.csv",
            """
            SELECT
              table_schema AS schema,
              table_name AS table_ou_vue,
              table_type AS type,
              (
                SELECT COUNT(*)
                FROM information_schema.columns c
                WHERE c.table_schema = t.table_schema
                  AND c.table_name = t.table_name
              ) AS nb_colonnes
            FROM information_schema.tables t
            WHERE table_schema NOT IN ('public','pg_catalog','information_schema')
            ORDER BY table_schema, table_type, table_name
            """,
            ["schema", "table_ou_vue", "type", "nb_colonnes"],
        )

        # CSV 2 — Toutes les colonnes par table/vue
        export_csv(
            conn,
            "mapping_02_colonnes.csv",
            """
            SELECT
              table_schema AS schema,
              table_name AS table_ou_vue,
              column_name AS colonne,
              data_type AS type_sql,
              is_nullable AS nullable,
              column_default AS valeur_defaut
            FROM information_schema.columns
            WHERE table_schema NOT IN ('public','pg_catalog','information_schema')
            ORDER BY table_schema, table_name, ordinal_position
            """,
            ["schema", "table_ou_vue", "colonne", "type_sql", "nullable", "valeur_defaut"],
        )

        # CSV 3 — Données disponibles par variable et source
        export_csv(
            conn,
            "mapping_03_donnees_par_variable_source.csv",
            """
            SELECT
              rv.code AS variable,
              rs.code AS source,
              COUNT(*) AS nb_mesures,
              MIN(m.time) AS date_debut,
              MAX(m.time) AS date_fin,
              'ts.measurement' AS table_source
            FROM ts.measurement m
            JOIN ref.variable rv ON rv.variable_id = m.variable_id
            JOIN ref.source rs ON rs.source_id = m.source_id
            GROUP BY rv.code, rs.code

            UNION ALL

            SELECT
              rv.code AS variable,
              rs.code AS source,
              COUNT(*) AS nb_mesures,
              MIN(bm.time) AS date_debut,
              MAX(bm.time) AS date_fin,
              'ts.basin_measurement' AS table_source
            FROM ts.basin_measurement bm
            JOIN ref.variable rv ON rv.variable_id = bm.variable_id
            JOIN ref.source rs ON rs.source_id = bm.source_id
            GROUP BY rv.code, rs.code

            ORDER BY variable, source
            """,
            ["variable", "source", "nb_mesures", "date_debut", "date_fin", "table_source"],
        )

        # CSV 4 — Données par bassin/shape/source
        export_csv(
            conn,
            "mapping_04_donnees_par_bassin.csv",
            """
            SELECT
              gb.name AS bassin,
              CASE
                WHEN COALESCE(gb.code, '') ~* '^dgm[-_ ]*' THEN 'DGM'
                ELSE 'ABH'
              END AS shape,
              rv.code AS variable,
              rs.code AS source,
              COUNT(*) AS nb_mesures,
              MIN(bm.time) AS date_debut,
              MAX(bm.time) AS date_fin
            FROM ts.basin_measurement bm
            JOIN geo.basin gb ON gb.basin_id = bm.basin_id
            JOIN ref.variable rv ON rv.variable_id = bm.variable_id
            JOIN ref.source rs ON rs.source_id = bm.source_id
            GROUP BY
              gb.name,
              CASE WHEN COALESCE(gb.code, '') ~* '^dgm[-_ ]*' THEN 'DGM' ELSE 'ABH' END,
              rv.code,
              rs.code
            ORDER BY
              shape,
              gb.name,
              rv.code,
              rs.code
            """,
            ["bassin", "shape", "variable", "source", "nb_mesures", "date_debut", "date_fin"],
        )

        # CSV 5 — Données par station/source
        export_csv(
            conn,
            "mapping_05_donnees_par_station.csv",
            """
            SELECT
              gs.name AS station,
              gs.code AS code_station,
              gs.station_type AS type_station,
              rv.code AS variable,
              rs.code AS source,
              COUNT(*) AS nb_mesures,
              MIN(m.time) AS date_debut,
              MAX(m.time) AS date_fin
            FROM ts.measurement m
            JOIN geo.station gs ON gs.station_id = m.station_id
            JOIN ref.variable rv ON rv.variable_id = m.variable_id
            JOIN ref.source rs ON rs.source_id = m.source_id
            GROUP BY gs.name, gs.code, gs.station_type, rv.code, rs.code
            ORDER BY gs.name, rv.code, rs.code
            """,
            [
                "station",
                "code_station",
                "type_station",
                "variable",
                "source",
                "nb_mesures",
                "date_debut",
                "date_fin",
            ],
        )

        # CSV 6 — Mapping valeurs affichées → sources
        export_csv(
            conn,
            "mapping_06_recap_barrage_echantillon.csv",
            """
            SELECT
              jour,
              barrage,
              bassin,
              ROUND(pluie_moy_mm::numeric, 2) AS pluie_moy_mm,
              ROUND(retenue_sim_8h_mm3::numeric, 1) AS retenue_mm3,
              ROUND(apports_mm3::numeric, 2) AS apports_mm3,
              ROUND(creux_mm3::numeric, 1) AS creux_mm3,
              ROUND(lacher_mm3::numeric, 2) AS lacher_mm3,
              ROUND(debit_max_m3s::numeric, 1) AS debit_max,
              ROUND(debit_moy_m3s::numeric, 1) AS debit_moy
            FROM api.v_recap_barrage_journalier
            ORDER BY barrage, jour DESC
            LIMIT 200
            """,
            [
                "jour",
                "barrage",
                "bassin",
                "pluie_moy_mm",
                "retenue_mm3",
                "apports_mm3",
                "creux_mm3",
                "lacher_mm3",
                "debit_max",
                "debit_moy",
            ],
        )

        # CSV 7 — Définitions des vues (pour audit)
        export_csv(
            conn,
            "mapping_07_definitions_vues.csv",
            """
            SELECT
              schemaname AS schema,
              viewname AS vue,
              'VIEW' AS type,
              definition AS sql_definition
            FROM pg_views
            WHERE schemaname NOT IN ('public','pg_catalog','information_schema')

            UNION ALL

            SELECT
              schemaname AS schema,
              matviewname AS vue,
              'MATERIALIZED VIEW' AS type,
              definition AS sql_definition
            FROM pg_matviews
            WHERE schemaname NOT IN ('public','pg_catalog','information_schema')

            ORDER BY schema, vue
            """,
            ["schema", "vue", "type", "sql_definition"],
        )

        # CSV 8 — Anomalies doublons bassins
        export_csv(
            conn,
            "mapping_08_anomalies_doublons_bassins.csv",
            """
            WITH basin_shape AS (
              SELECT
                b.basin_id,
                b.name AS nom,
                CASE
                  WHEN COALESCE(b.code, '') ~* '^dgm[-_ ]*' THEN 'DGM'
                  ELSE 'ABH'
                END AS shape
              FROM geo.basin b
            ),
            duplicated_names AS (
              SELECT nom
              FROM basin_shape
              GROUP BY nom
              HAVING COUNT(DISTINCT shape) > 1
            )
            SELECT
              bs.nom AS bassin,
              bs.shape AS shape,
              rs.code AS source,
              rv.code AS variable,
              COUNT(*) AS nb_mesures,
              MIN(bm.time) AS date_debut,
              MAX(bm.time) AS date_fin,
              CASE
                WHEN COUNT(*) > 0
                 AND bs.shape <> 'DGM'
                 AND rs.code = 'OBS'
                THEN '⚠️ OBS inattendu sur shape non-DGM'
                ELSE 'OK'
              END AS anomalie
            FROM ts.basin_measurement bm
            JOIN basin_shape bs ON bs.basin_id = bm.basin_id
            JOIN ref.variable rv ON rv.variable_id = bm.variable_id
            JOIN ref.source rs ON rs.source_id = bm.source_id
            WHERE bs.nom IN (SELECT nom FROM duplicated_names)
            GROUP BY bs.nom, bs.shape, rs.code, rv.code
            ORDER BY bs.nom, bs.shape, rs.code
            """,
            [
                "bassin",
                "shape",
                "source",
                "variable",
                "nb_mesures",
                "date_debut",
                "date_fin",
                "anomalie",
            ],
        )

        print("\nFichiers generes a la racine du projet :")
        print("  mapping_01_inventaire_tables.csv")
        print("  mapping_02_colonnes.csv")
        print("  mapping_03_donnees_par_variable_source.csv")
        print("  mapping_04_donnees_par_bassin.csv")
        print("  mapping_05_donnees_par_station.csv")
        print("  mapping_06_recap_barrage_echantillon.csv")
        print("  mapping_07_definitions_vues.csv")
        print("  mapping_08_anomalies_doublons_bassins.csv")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
