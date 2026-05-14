Thematic map asset storage structure:

- `assets/flood/<product_id>/`
- `assets/snow/<product_id>/`

Recommended files per product:

- `classification.tif`: thematic raster (continuous or classified)
- `mask_positive.tif`: binary mask for flooded/snowed class
- `mask_negative.tif`: binary mask for non-flooded/non-snowed class
- `stats.json`: persisted area stats in m2/km2/ha/percentage
- `metadata.json`: acquisition dates, sensor, processing provenance

API serving endpoint:

- `GET /api/v1/thematic-maps/assets/{map_type}/{product_id}/{file_path}`
