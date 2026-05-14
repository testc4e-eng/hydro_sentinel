-- Sebou monitoring schema (isolated from existing Hydro Sentinel schemas).
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_raster;

CREATE SCHEMA IF NOT EXISTS sebou;

CREATE TABLE IF NOT EXISTS sebou.basin_boundary (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    area_km2 NUMERIC(10, 2),
    geom GEOMETRY(MultiPolygon, 32629)
);
CREATE INDEX IF NOT EXISTS idx_sebou_basin_geom ON sebou.basin_boundary USING GIST (geom);

CREATE TABLE IF NOT EXISTS sebou.daily_statistics (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    snow_area_km2 NUMERIC(10, 2),
    snow_percentage NUMERIC(5, 2),
    mean_snow_elevation NUMERIC(7, 2),
    flood_area_km2 NUMERIC(10, 2),
    quality_score NUMERIC(5, 2),
    data_sources TEXT[],
    processing_time_seconds INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sebou_daily_stats_date ON sebou.daily_statistics (date DESC);

CREATE TABLE IF NOT EXISTS sebou.flood_extents (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    area_km2 NUMERIC(10, 2),
    detection_confidence NUMERIC(4, 2),
    sensor VARCHAR(50),
    geom GEOMETRY(MultiPolygon, 32629),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sebou_flood_geom ON sebou.flood_extents USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_sebou_flood_date ON sebou.flood_extents (date DESC);

CREATE TABLE IF NOT EXISTS sebou.snow_extents (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    area_km2 NUMERIC(10, 2),
    detection_confidence NUMERIC(4, 2),
    sensor VARCHAR(50),
    geom GEOMETRY(MultiPolygon, 32629),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sebou_snow_geom ON sebou.snow_extents USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_sebou_snow_date ON sebou.snow_extents (date DESC);

CREATE TABLE IF NOT EXISTS sebou.alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT,
    affected_area_km2 NUMERIC(10, 2),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sebou_alerts_status ON sebou.alerts (status, created_at DESC);

CREATE TABLE IF NOT EXISTS sebou.validation_stations (
    id SERIAL PRIMARY KEY,
    station_code VARCHAR(50) UNIQUE NOT NULL,
    station_name VARCHAR(200),
    station_type VARCHAR(50),
    elevation NUMERIC(7, 2),
    geom GEOMETRY(Point, 32629),
    active BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_sebou_stations_geom ON sebou.validation_stations USING GIST (geom);

CREATE TABLE IF NOT EXISTS sebou.field_observations (
    id SERIAL PRIMARY KEY,
    station_id INTEGER REFERENCES sebou.validation_stations(id),
    observation_date DATE NOT NULL,
    observation_type VARCHAR(50),
    value NUMERIC(10, 3),
    unit VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sebou_observations_date ON sebou.field_observations (observation_date DESC);

CREATE TABLE IF NOT EXISTS sebou.quality_reports (
    id SERIAL PRIMARY KEY,
    processing_date DATE NOT NULL,
    sensor VARCHAR(50),
    cloud_cover_percentage NUMERIC(5, 2),
    spatial_coverage_percentage NUMERIC(5, 2),
    quality_flags TEXT[],
    validation_score NUMERIC(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE VIEW sebou.v_latest_status AS
SELECT
    ds.date,
    ds.snow_area_km2,
    ds.snow_percentage,
    ds.flood_area_km2,
    ds.quality_score,
    COUNT(a.id) AS active_alerts,
    MAX(a.severity) AS highest_alert_severity
FROM sebou.daily_statistics ds
LEFT JOIN sebou.alerts a
    ON a.status = 'active'
    AND a.created_at::date = ds.date
WHERE ds.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY ds.date, ds.snow_area_km2, ds.snow_percentage, ds.flood_area_km2, ds.quality_score
ORDER BY ds.date DESC;
