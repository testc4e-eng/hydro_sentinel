# Prompt d'Implémentation - Workflow Monitoring Bassin Sebou
## Pour Agent IA (Antigravity/Codex)

---

# CONTEXTE DU PROJET

Tu es un agent IA expert en télédétection, traitement d'images satellitaires et développement de systèmes de monitoring environnemental. Ta mission est d'implémenter un système complet de surveillance de la couverture neigeuse et des zones inondées pour le bassin versant du Sebou au Maroc.

## Objectifs principaux
1. **Monitoring automatisé** de la couverture neigeuse (quotidien)
2. **Détection des inondations** lors d'événements pluvieux (événementiel)
3. **Production de données cartographiques** (raster + vecteur)
4. **Dashboard web interactif** pour visualisation temps réel
5. **Validation et contrôle qualité** des résultats

## Technologies imposées
- **Backend**: Python 3.9+ avec Google Earth Engine API
- **Base de données**: PostgreSQL 15 + PostGIS 3.3
- **Traitement**: GDAL, Rasterio, GeoPandas, Scikit-learn
- **Serveur carto**: GeoServer 2.23+
- **Frontend**: HTML/CSS/JavaScript avec Leaflet.js
- **Orchestration**: Apache Airflow ou cron + Python
- **Format sorties**: Cloud Optimized GeoTIFF (COG), GeoJSON

## Contraintes techniques
- Résolution spatiale: 500m (MODIS) et 10m (Sentinel-1)
- Zone d'intérêt: Bassin du Sebou (~40,000 km²)
- Fréquence: Traitement quotidien à 06h00 UTC
- Rétention données: 2 ans en ligne, archivage au-delà
- Temps de traitement max: 2h par cycle

---

# PHASE 1: CONFIGURATION ENVIRONNEMENT

## Tâche 1.1: Infrastructure de base

**Action requise**: Configure un environnement Python complet avec toutes les dépendances

```bash
# Crée un environnement virtuel
python3 -m venv /opt/sebou_monitoring/venv

# Active et installe les packages
source /opt/sebou_monitoring/venv/bin/activate

pip install earthengine-api==0.1.384
pip install geopandas==0.14.1
pip install rasterio==1.3.9
pip install GDAL==3.8.0
pip install psycopg2-binary==2.9.9
pip install SQLAlchemy==2.0.23
pip install GeoAlchemy2==0.14.2
pip install pandas==2.1.4
pip install numpy==1.26.2
pip install scikit-learn==1.3.2
pip install fastapi==0.109.0
pip install uvicorn==0.25.0
pip install python-dotenv==1.0.0
pip install pyyaml==6.0.1
pip install schedule==1.2.0
pip install requests==2.31.0
pip install Pillow==10.1.0
```

**Critères de validation**:
- ✅ Tous les packages installés sans erreur
- ✅ Version Python >= 3.9
- ✅ Test import: `import ee; import geopandas; import rasterio`
²
## Tâche 1.2: Configuration Google Earth Engine

**Action requise**: Initialise l'authentification GEE

```python
import ee

# Méthode 1: Authentification interactive (développement)
ee.Authenticate()
ee.Initialize()

# Méthode 2: Service Account (production)
# credentials = ee.ServiceAccountCredentials(
#     email='your-service-account@project.iam.gserviceaccount.com',
#     key_file='/path/to/private-key.json'
# )
# ee.Initialize(credentials)

# Test de connexion
test_image = ee.Image('USGS/SRTMGL1_003')
print("GEE initialisé avec succès!")
print(f"Projection: {test_image.projection().getInfo()}")
```

**Critères de validation**:
- ✅ Authentification réussie sans erreur
- ✅ Accès aux collections MODIS et Sentinel confirmé
- ✅ Test de requête simple exécuté

## Tâche 1.3: Base de données PostgreSQL/PostGIS

**Action requise**: Crée la structure de base de données

```sql
-- Connexion PostgreSQL
CREATE DATABASE sebou_monitoring;
\c sebou_monitoring;

-- Active PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_raster;

-- Table limites bassin
CREATE TABLE basin_boundary (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    area_km2 NUMERIC(10, 2),
    geom GEOMETRY(MultiPolygon, 32629) -- UTM Zone 29N
);

-- Index spatial
CREATE INDEX idx_basin_geom ON basin_boundary USING GIST(geom);

-- Table statistiques quotidiennes
CREATE TABLE daily_statistics (
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

-- Index temporel
CREATE INDEX idx_daily_stats_date ON daily_statistics(date DESC);

-- Table zones inondées
CREATE TABLE flood_extents (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    area_km2 NUMERIC(10, 2),
    detection_confidence NUMERIC(4, 2),
    sensor VARCHAR(50),
    geom GEOMETRY(MultiPolygon, 32629),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_flood_geom ON flood_extents USING GIST(geom);
CREATE INDEX idx_flood_date ON flood_extents(date DESC);

-- Table alertes
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL, -- 'flood', 'snow_anomaly', 'quality_issue'
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    message TEXT,
    affected_area_km2 NUMERIC(10, 2),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved', 'false_positive'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE INDEX idx_alerts_status ON alerts(status, created_at DESC);

-- Table stations validation
CREATE TABLE validation_stations (
    id SERIAL PRIMARY KEY,
    station_code VARCHAR(50) UNIQUE NOT NULL,
    station_name VARCHAR(200),
    station_type VARCHAR(50), -- 'meteo', 'hydro', 'snow'
    elevation NUMERIC(7, 2),
    geom GEOMETRY(Point, 32629),
    active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_stations_geom ON validation_stations USING GIST(geom);

-- Table observations terrain
CREATE TABLE field_observations (
    id SERIAL PRIMARY KEY,
    station_id INTEGER REFERENCES validation_stations(id),
    observation_date DATE NOT NULL,
    observation_type VARCHAR(50), -- 'snow_presence', 'flood_extent', 'temperature'
    value NUMERIC(10, 3),
    unit VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_observations_date ON field_observations(observation_date DESC);

-- Table rapports qualité
CREATE TABLE quality_reports (
    id SERIAL PRIMARY KEY,
    processing_date DATE NOT NULL,
    sensor VARCHAR(50),
    cloud_cover_percentage NUMERIC(5, 2),
    spatial_coverage_percentage NUMERIC(5, 2),
    quality_flags TEXT[],
    validation_score NUMERIC(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vue agrégée pour dashboard
CREATE VIEW v_latest_status AS
SELECT 
    ds.date,
    ds.snow_area_km2,
    ds.snow_percentage,
    ds.flood_area_km2,
    ds.quality_score,
    COUNT(a.id) as active_alerts,
    MAX(a.severity) as highest_alert_severity
FROM daily_statistics ds
LEFT JOIN alerts a ON a.status = 'active' AND a.created_at::date = ds.date
WHERE ds.date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY ds.date, ds.snow_area_km2, ds.snow_percentage, 
         ds.flood_area_km2, ds.quality_score
ORDER BY ds.date DESC;
```

**Critères de validation**:
- ✅ Base de données créée avec extension PostGIS
- ✅ Toutes les tables créées sans erreur
- ✅ Index spatiaux et temporels en place
- ✅ Test insertion/sélection réussi

## Tâche 1.4: Structure des répertoires

**Action requise**: Crée l'arborescence complète

```bash
mkdir -p /data/sebou_monitoring/{raw,processed,products,validation,metadata,logs}
mkdir -p /data/sebou_monitoring/raw/{modis,sentinel1,sentinel2,auxiliary}
mkdir -p /data/sebou_monitoring/processed/{snow,flood,masks}
mkdir -p /data/sebou_monitoring/products/{cog,vectors,statistics,thumbnails}
mkdir -p /data/sebou_monitoring/validation/{stations,field_data,reports}
mkdir -p /opt/sebou_monitoring/{src,config,scripts,tests}
mkdir -p /opt/sebou_monitoring/src/{acquisition,preprocessing,detection,validation,export,api}

# Fichier de configuration principal
cat > /opt/sebou_monitoring/config/config.yaml << 'EOF'
project:
  name: "Sebou Basin Monitoring"
  version: "1.0.0"
  basin_name: "Sebou"
  crs: "EPSG:32629"  # UTM Zone 29N

paths:
  data_root: "/data/sebou_monitoring"
  raw_data: "/data/sebou_monitoring/raw"
  processed_data: "/data/sebou_monitoring/processed"
  products: "/data/sebou_monitoring/products"
  logs: "/data/sebou_monitoring/logs"

database:
  host: "localhost"
  port: 5432
  database: "sebou_monitoring"
  user: "sebou_user"
  password: "${DB_PASSWORD}"  # Via variable d'environnement

gee:
  project: "your-gee-project"
  service_account: "your-sa@project.iam.gserviceaccount.com"
  key_file: "/opt/sebou_monitoring/config/gee-key.json"

sensors:
  modis:
    collection: "MODIS/006/MOD10A1"
    scale: 500
    bands: ["NDSI_Snow_Cover", "NDSI"]
  sentinel1:
    collection: "COPERNICUS/S1_GRD"
    scale: 10
    polarisation: ["VV", "VH"]
  sentinel2:
    collection: "COPERNICUS/S2_SR_HARMONIZED"
    scale: 10
    bands: ["B2", "B3", "B4", "B8", "B11", "B12"]

processing:
  snow_detection:
    ndsi_threshold_high_elev: 0.4  # > 2000m
    ndsi_threshold_mid_elev: 0.5   # 1000-2000m
    ndsi_threshold_low_elev: 0.6   # < 1000m
    nir_threshold: 0.11
    min_area_pixels: 9  # Filtre petits clusters
  
  flood_detection:
    sar_difference_threshold: -4.0  # dB
    sar_absolute_threshold: -15.0   # dB
    max_slope: 5.0  # degrés
    min_area_pixels: 25

schedule:
  daily_processing: "0 6 * * *"  # 06h00 UTC quotidien
  validation_check: "0 8 * * *"  # 08h00 UTC quotidien
  cleanup_old_data: "0 2 * * 0"  # 02h00 UTC dimanche

alerts:
  email:
    enabled: true
    smtp_server: "smtp.example.com"
    smtp_port: 587
    from_address: "monitoring@example.com"
    recipients: ["equipe@example.com"]
  thresholds:
    flood_area_critical: 10.0  # km²
    snow_anomaly_zscore: 2.5
    quality_score_minimum: 70.0
EOF

# Fichier .env pour secrets
cat > /opt/sebou_monitoring/config/.env << 'EOF'
DB_PASSWORD=your_secure_password
GEE_PROJECT=your-gee-project
SMTP_PASSWORD=your_smtp_password
EOF

chmod 600 /opt/sebou_monitoring/config/.env
```

**Critères de validation**:
- ✅ Arborescence complète créée
- ✅ Fichier config.yaml valide (test avec `pyyaml`)
- ✅ Permissions appropriées sur fichiers sensibles

---

# PHASE 2: ACQUISITION ET PRÉTRAITEMENT

## Tâche 2.1: Module acquisition données

**Action requise**: Implémente la classe d'acquisition multi-sources

```python
# /opt/sebou_monitoring/src/acquisition/data_acquirer.py

import ee
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import yaml
import logging

class SebouDataAcquirer:
    """
    Gestionnaire d'acquisition de données satellitaires pour le bassin du Sebou
    """
    
    def __init__(self, config_path: str):
        """Initialise l'acquéreur avec configuration"""
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Initialiser GEE
        ee.Initialize()
        
        # Charger limite bassin
        self.basin = self._load_basin_boundary()
        
        # Logger
        self.logger = logging.getLogger(__name__)
    
    def _load_basin_boundary(self) -> ee.Geometry:
        """Charge la limite du bassin depuis asset GEE ou fichier"""
        # Option 1: Depuis GEE Asset
        try:
            basin_fc = ee.FeatureCollection('projects/your-project/assets/sebou_basin')
            return basin_fc.geometry()
        except:
            # Option 2: Depuis coordonnées approximatives
            # TODO: Remplacer par vraies coordonnées du bassin
            self.logger.warning("Utilisation coordonnées approximatives du bassin")
            return ee.Geometry.Rectangle([-5.5, 33.5, -4.0, 34.8])
    
    def acquire_modis_snow(
        self, 
        start_date: datetime, 
        end_date: datetime,
        max_cloud_cover: float = 50.0
    ) -> ee.ImageCollection:
        """
        Acquiert données MODIS Snow Cover
        
        Args:
            start_date: Date de début
            end_date: Date de fin
            max_cloud_cover: Couverture nuageuse max (%)
        
        Returns:
            ImageCollection MODIS filtrée
        """
        self.logger.info(f"Acquisition MODIS {start_date} à {end_date}")
        
        # Charger collection
        collection = ee.ImageCollection('MODIS/006/MOD10A1') \
            .filterBounds(self.basin) \
            .filterDate(start_date.strftime('%Y-%m-%d'), 
                       end_date.strftime('%Y-%m-%d'))
        
        # Filtrer qualité
        def filter_quality(image):
            qa = image.select('NDSI_Snow_Cover_Basic_QA')
            # Garder seulement best quality (valeur 0)
            good_quality = qa.eq(0)
            return image.updateMask(good_quality)
        
        collection_filtered = collection.map(filter_quality)
        
        size = collection_filtered.size().getInfo()
        self.logger.info(f"Images MODIS trouvées: {size}")
        
        return collection_filtered
    
    def acquire_sentinel1_sar(
        self,
        start_date: datetime,
        end_date: datetime,
        orbit_direction: str = 'DESCENDING'
    ) -> ee.ImageCollection:
        """
        Acquiert données Sentinel-1 SAR
        
        Args:
            start_date: Date de début
            end_date: Date de fin
            orbit_direction: Direction orbite ('ASCENDING' ou 'DESCENDING')
        
        Returns:
            ImageCollection Sentinel-1 filtrée et prétraitée
        """
        self.logger.info(f"Acquisition Sentinel-1 {start_date} à {end_date}")
        
        collection = ee.ImageCollection('COPERNICUS/S1_GRD') \
            .filterBounds(self.basin) \
            .filterDate(start_date.strftime('%Y-%m-%d'),
                       end_date.strftime('%Y-%m-%d')) \
            .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV')) \
            .filter(ee.Filter.eq('instrumentMode', 'IW')) \
            .filter(ee.Filter.eq('orbitProperties_pass', orbit_direction))
        
        # Sélectionner polarisation VV
        collection = collection.select('VV')
        
        size = collection.size().getInfo()
        self.logger.info(f"Images Sentinel-1 trouvées: {size}")
        
        return collection
    
    def acquire_sentinel2_optical(
        self,
        start_date: datetime,
        end_date: datetime,
        max_cloud_cover: float = 30.0
    ) -> ee.ImageCollection:
        """
        Acquiert données Sentinel-2 optiques
        
        Args:
            start_date: Date de début
            end_date: Date de fin
            max_cloud_cover: Couverture nuageuse max (%)
        
        Returns:
            ImageCollection Sentinel-2 L2A filtrée
        """
        self.logger.info(f"Acquisition Sentinel-2 {start_date} à {end_date}")
        
        collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
            .filterBounds(self.basin) \
            .filterDate(start_date.strftime('%Y-%m-%d'),
                       end_date.strftime('%Y-%m-%d')) \
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', max_cloud_cover))
        
        # Masquer nuages avec SCL
        def mask_clouds(image):
            scl = image.select('SCL')
            # Classes sans nuages: 4 (végétation), 5 (sol nu), 6 (eau), 11 (neige)
            clear = scl.eq(4).Or(scl.eq(5)).Or(scl.eq(6)).Or(scl.eq(11))
            return image.updateMask(clear)
        
        collection_masked = collection.map(mask_clouds)
        
        size = collection_masked.size().getInfo()
        self.logger.info(f"Images Sentinel-2 trouvées: {size}")
        
        return collection_masked
    
    def get_auxiliary_data(self) -> Dict[str, ee.Image]:
        """
        Charge données auxiliaires (DEM, masques permanents)
        
        Returns:
            Dictionnaire avec DEM, slope, permanent_water, etc.
        """
        self.logger.info("Chargement données auxiliaires")
        
        # DEM SRTM
        dem = ee.Image('USGS/SRTMGL1_003').clip(self.basin)
        
        # Calculer pente
        slope = ee.Terrain.slope(dem)
        
        # Plans d'eau permanents (Global Surface Water)
        gsw = ee.Image('JRC/GSW1_4/GlobalSurfaceWater')
        permanent_water = gsw.select('max_extent').eq(1)
        
        # Masque urbain (World Settlement Footprint)
        # wsf = ee.ImageCollection('ESA/WorldCover/v100').first()
        # urban = wsf.select('Map').eq(50)  # Classe 50 = urbain
        
        return {
            'dem': dem,
            'elevation': dem.select('elevation'),
            'slope': slope,
            'permanent_water': permanent_water.clip(self.basin),
            # 'urban_mask': urban.clip(self.basin)
        }
    
    def export_to_drive(
        self,
        image: ee.Image,
        description: str,
        scale: int = 500,
        region: Optional[ee.Geometry] = None
    ) -> ee.batch.Task:
        """
        Exporte image vers Google Drive
        
        Args:
            image: Image à exporter
            description: Nom du fichier
            scale: Résolution en mètres
            region: Zone d'export (bassin par défaut)
        
        Returns:
            Task d'export
        """
        if region is None:
            region = self.basin
        
        task = ee.batch.Export.image.toDrive(
            image=image.toFloat(),
            description=description,
            folder='Sebou_Monitoring',
            region=region,
            scale=scale,
            crs='EPSG:32629',
            fileFormat='GeoTIFF',
            formatOptions={'cloudOptimized': True},
            maxPixels=1e10
        )
        
        task.start()
        self.logger.info(f"Export démarré: {description}")
        
        return task


# Fonction utilitaire pour tests
def test_acquisition():
    """Test rapide du module d'acquisition"""
    import logging
    logging.basicConfig(level=logging.INFO)
    
    acquirer = SebouDataAcquirer('/opt/sebou_monitoring/config/config.yaml')
    
    # Test dates
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    
    # Test MODIS
    modis = acquirer.acquire_modis_snow(start_date, end_date)
    print(f"MODIS images: {modis.size().getInfo()}")
    
    # Test Sentinel-1
    s1 = acquirer.acquire_sentinel1_sar(start_date, end_date)
    print(f"Sentinel-1 images: {s1.size().getInfo()}")
    
    # Test auxiliaires
    aux = acquirer.get_auxiliary_data()
    print(f"DEM loaded: {aux['dem'].getInfo()['type']}")
    
    print("✅ Tests d'acquisition réussis!")


if __name__ == '__main__':
    test_acquisition()
```

**Instructions pour l'agent**:
1. Crée ce fichier exactement comme spécifié
2. Teste l'import: `python -m src.acquisition.data_acquirer`
3. Vérifie que les collections sont accessibles
4. Note tout problème d'authentification GEE

**Critères de validation**:
- ✅ Imports sans erreur
- ✅ Connexion GEE établie
- ✅ Collections MODIS/Sentinel accessibles
- ✅ Fonction test s'exécute sans erreur

## Tâche 2.2: Module prétraitement

**Action requise**: Implémente les corrections atmosphériques et filtres

```python
# /opt/sebou_monitoring/src/preprocessing/preprocessor.py

import ee
import logging
from typing import Dict, Optional, Tuple
import math

class ImagePreprocessor:
    """
    Classe pour prétraitement des images satellitaires
    Inclut corrections atmosphériques, topographiques, filtrage
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def preprocess_modis(
        self,
        image: ee.Image,
        apply_quality_mask: bool = True
    ) -> ee.Image:
        """
        Prétraite image MODIS MOD10A1 (Snow Cover)
        
        Args:
            image: Image MODIS brute
            apply_quality_mask: Appliquer masque qualité
        
        Returns:
            Image prétraitée
        """
        # Sélectionner bandes
        snow_cover = image.select('NDSI_Snow_Cover')
        ndsi = image.select('NDSI')
        
        # Masque qualité si demandé
        if apply_quality_mask:
            qa = image.select('NDSI_Snow_Cover_Basic_QA')
            quality_mask = qa.lte(1)  # 0=best, 1=good
            snow_cover = snow_cover.updateMask(quality_mask)
            ndsi = ndsi.updateMask(quality_mask)
        
        # Échelle NDSI
        ndsi = ndsi.multiply(0.0001)  # Facteur d'échelle MODIS
        
        # Combiner
        processed = ee.Image.cat([
            snow_cover.rename('snow_cover'),
            ndsi.rename('NDSI')
        ]).copyProperties(image, ['system:time_start', 'system:index'])
        
        return processed
    
    def preprocess_sentinel1(
        self,
        image: ee.Image,
        apply_speckle_filter: bool = True
    ) -> ee.Image:
        """
        Prétraite image Sentinel-1 SAR
        
        Args:
            image: Image S1 GRD brute
            apply_speckle_filter: Appliquer filtre anti-speckle
        
        Returns:
            Image prétraitée en dB avec filtre
        """
        # Conversion en dB
        image_db = ee.Image(10).multiply(image.log10())
        
        # Filtre Lee Sigma si demandé
        if apply_speckle_filter:
            image_db = self._lee_sigma_filter(image_db)
        
        return image_db.copyProperties(image, ['system:time_start', 'system:index'])
    
    def _lee_sigma_filter(
        self,
        image: ee.Image,
        kernel_size: int = 7
    ) -> ee.Image:
        """
        Applique filtre Lee Sigma pour réduire speckle SAR
        
        Args:
            image: Image SAR en dB
            kernel_size: Taille kernel (pixels)
        
        Returns:
            Image filtrée
        """
        # Paramètres
        Tk = ee.Image.constant(7)  # Nombre de regards
        kernel = ee.Kernel.square(kernel_size / 2, 'pixels')
        
        # Moyenne et variance locales
        mean = image.reduceNeighborhood(
            reducer=ee.Reducer.mean(),
            kernel=kernel
        )
        
        variance = image.reduceNeighborhood(
            reducer=ee.Reducer.variance(),
            kernel=kernel
        )
        
        # Coefficient de variation
        cv = variance.sqrt().divide(mean)
        
        # Pondération
        weight = cv.multiply(cv).multiply(Tk.add(1)) \
                  .divide(cv.multiply(cv).multiply(Tk).add(1))
        
        # Image filtrée
        filtered = mean.multiply(weight) \
                      .add(image.multiply(weight.multiply(-1).add(1)))
        
        return filtered.rename(image.bandNames())
    
    def preprocess_sentinel2(
        self,
        image: ee.Image,
        apply_cloud_mask: bool = True
    ) -> ee.Image:
        """
        Prétraite image Sentinel-2 L2A
        
        Args:
            image: Image S2 L2A (déjà correction atmo Sen2Cor)
            apply_cloud_mask: Appliquer masque nuages
        
        Returns:
            Image prétraitée avec réflectance [0-1]
        """
        # Sélectionner bandes
        bands = image.select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12'])
        
        # Conversion en réflectance [0-1]
        reflectance = bands.divide(10000)
        
        # Masque nuages si demandé
        if apply_cloud_mask:
            scl = image.select('SCL')
            clear_sky = scl.eq(4).Or(scl.eq(5)).Or(scl.eq(6)).Or(scl.eq(11))
            reflectance = reflectance.updateMask(clear_sky)
        
        return reflectance.copyProperties(image, 
                                         ['system:time_start', 'system:index'])
    
    def apply_terrain_correction(
        self,
        image: ee.Image,
        dem: ee.Image,
        solar_azimuth: Optional[float] = None,
        solar_zenith: Optional[float] = None
    ) -> ee.Image:
        """
        Applique correction topographique (C-correction)
        
        Args:
            image: Image optique à corriger
            dem: Modèle numérique terrain
            solar_azimuth: Azimut solaire (degrés) ou None pour utiliser métadonnées
            solar_zenith: Zénith solaire (degrés) ou None pour utiliser métadonnées
        
        Returns:
            Image corrigée
        """
        # Extraire angles solaires des métadonnées si non fournis
        if solar_azimuth is None:
            solar_azimuth = ee.Number(image.get('MEAN_SOLAR_AZIMUTH_ANGLE'))
        else:
            solar_azimuth = ee.Number(solar_azimuth)
        
        if solar_zenith is None:
            solar_zenith = ee.Number(image.get('MEAN_SOLAR_ZENITH_ANGLE'))
        else:
            solar_zenith = ee.Number(solar_zenith)
        
        # Calculer pente et aspect
        terrain = ee.Terrain.products(dem)
        slope = terrain.select('slope')
        aspect = terrain.select('aspect')
        
        # Conversion degrés -> radians
        deg2rad = math.pi / 180
        
        # Angle d'incidence cosinus
        cos_i = (solar_zenith.multiply(deg2rad).cos()
                .multiply(slope.multiply(deg2rad).cos())
                .add(solar_zenith.multiply(deg2rad).sin()
                    .multiply(slope.multiply(deg2rad).sin())
                    .multiply(aspect.subtract(solar_azimuth)
                            .multiply(deg2rad).cos())))
        
        # C-correction: éviter division par zéro
        cos_i = cos_i.max(0.01)
        
        # Appliquer correction
        corrected = image.divide(cos_i)
        
        return corrected.copyProperties(image, ['system:time_start', 'system:index'])
    
    def create_composite(
        self,
        collection: ee.ImageCollection,
        method: str = 'median'
    ) -> ee.Image:
        """
        Crée composite temporel
        
        Args:
            collection: Collection d'images
            method: Méthode de composite ('median', 'mean', 'max', 'min')
        
        Returns:
            Image composite
        """
        if method == 'median':
            composite = collection.median()
        elif method == 'mean':
            composite = collection.mean()
        elif method == 'max':
            composite = collection.max()
        elif method == 'min':
            composite = collection.min()
        else:
            raise ValueError(f"Méthode inconnue: {method}")
        
        # Ajouter date moyenne
        dates = collection.aggregate_array('system:time_start')
        mean_date = dates.reduce(ee.Reducer.mean())
        
        return composite.set('system:time_start', mean_date)


# Tests
def test_preprocessing():
    """Test du module de prétraitement"""
    import logging
    from datetime import datetime, timedelta
    from src.acquisition.data_acquirer import SebouDataAcquirer
    
    logging.basicConfig(level=logging.INFO)
    
    # Acquérir données test
    acquirer = SebouDataAcquirer('/opt/sebou_monitoring/config/config.yaml')
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    
    # Test MODIS
    modis_col = acquirer.acquire_modis_snow(start_date, end_date)
    if modis_col.size().getInfo() > 0:
        modis_img = modis_col.first()
        
        preprocessor = ImagePreprocessor()
        modis_processed = preprocessor.preprocess_modis(modis_img)
        
        print(f"MODIS prétraité: {modis_processed.bandNames().getInfo()}")
    
    # Test Sentinel-1
    s1_col = acquirer.acquire_sentinel1_sar(start_date, end_date)
    if s1_col.size().getInfo() > 0:
        s1_img = s1_col.first()
        
        preprocessor = ImagePreprocessor()
        s1_processed = preprocessor.preprocess_sentinel1(s1_img)
        
        print(f"Sentinel-1 prétraité: {s1_processed.bandNames().getInfo()}")
    
    print("✅ Tests de prétraitement réussis!")


if __name__ == '__main__':
    test_preprocessing()
```

**Instructions pour l'agent**:
1. Crée le fichier preprocessor.py
2. Vérifie les imports et dépendances
3. Exécute les tests: `python -m src.preprocessing.preprocessor`
4. Valide que les filtres s'appliquent correctement

**Critères de validation**:
- ✅ Filtre Lee Sigma fonctionne sur SAR
- ✅ Masques qualité appliqués correctement
- ✅ Composites temporels créés sans erreur
- ✅ Tests passent avec succès

---

# PHASE 3: DÉTECTION THÉMATIQUE

## Tâche 3.1: Module détection neige

**Action requise**: Implémente algorithmes de détection neige multi-critères

```python
# /opt/sebou_monitoring/src/detection/snow_detector.py

import ee
import logging
from typing import Dict, Optional, Tuple

class SnowDetector:
    """
    Détecteur de couverture neigeuse avec critères multiples
    """
    
    def __init__(self, config: Dict):
        """
        Args:
            config: Configuration avec seuils NDSI, etc.
        """
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Seuils par défaut
        self.ndsi_threshold_high = config.get('ndsi_threshold_high_elev', 0.4)
        self.ndsi_threshold_mid = config.get('ndsi_threshold_mid_elev', 0.5)
        self.ndsi_threshold_low = config.get('ndsi_threshold_low_elev', 0.6)
        self.nir_threshold = config.get('nir_threshold', 0.11)
    
    def calculate_ndsi(self, image: ee.Image) -> ee.Image:
        """
        Calcule NDSI (Normalized Difference Snow Index)
        NDSI = (Green - SWIR) / (Green + SWIR)
        
        Args:
            image: Image avec bandes Green et SWIR
        
        Returns:
            Image avec bande NDSI ajoutée
        """
        # Détecter source (MODIS vs Sentinel-2)
        band_names = image.bandNames().getInfo()
        
        if 'sur_refl_b04' in band_names:
            # MODIS
            green = image.select('sur_refl_b04')
            swir = image.select('sur_refl_b06')
        elif 'B3' in band_names:
            # Sentinel-2
            green = image.select('B3')
            swir = image.select('B11')
        else:
            raise ValueError("Bandes Green/SWIR non trouvées")
        
        ndsi = green.subtract(swir).divide(green.add(swir)).rename('NDSI')
        
        return image.addBands(ndsi)
    
    def detect_snow_adaptive(
        self,
        image: ee.Image,
        dem: ee.Image,
        method: str = 'ndsi_adaptive'
    ) -> ee.Image:
        """
        Détecte neige avec seuil NDSI adaptatif selon altitude
        
        Args:
            image: Image avec bande NDSI
            dem: Modèle numérique terrain
            method: Méthode de détection
        
        Returns:
            Masque binaire neige (1=neige, 0=pas neige)
        """
        if method == 'ndsi_adaptive':
            return self._detect_ndsi_adaptive(image, dem)
        elif method == 'ndsi_simple':
            return self._detect_ndsi_simple(image)
        elif method == 'multi_criteria':
            return self._detect_multi_criteria(image, dem)
        else:
            raise ValueError(f"Méthode inconnue: {method}")
    
    def _detect_ndsi_adaptive(
        self,
        image: ee.Image,
        dem: ee.Image
    ) -> ee.Image:
        """
        Détection NDSI avec seuils adaptatifs par altitude
        """
        ndsi = image.select('NDSI')
        elevation = dem.select('elevation')
        
        # Seuils par tranche d'altitude
        threshold = elevation.expression(
            '(elev > 2000) ? t_high : ((elev > 1000) ? t_mid : t_low)',
            {
                'elev': elevation,
                't_high': self.ndsi_threshold_high,
                't_mid': self.ndsi_threshold_mid,
                't_low': self.ndsi_threshold_low
            }
        )
        
        # Masque neige
        snow = ndsi.gt(threshold).rename('snow_mask')
        
        return snow.selfMask()
    
    def _detect_ndsi_simple(self, image: ee.Image) -> ee.Image:
        """Détection NDSI avec seuil fixe"""
        ndsi = image.select('NDSI')
        snow = ndsi.gt(0.4).rename('snow_mask')
        return snow.selfMask()
    
    def _detect_multi_criteria(
        self,
        image: ee.Image,
        dem: ee.Image
    ) -> ee.Image:
        """
        Détection multi-critères:
        - NDSI adaptatif
        - Réflectance NIR élevée
        - Altitude (optionnel)
        """
        # Critère 1: NDSI adaptatif
        snow_ndsi = self._detect_ndsi_adaptive(image, dem)
        
        # Critère 2: NIR élevé
        band_names = image.bandNames().getInfo()
        if 'sur_refl_b02' in band_names:
            # MODIS
            nir = image.select('sur_refl_b02')
        elif 'B8' in band_names:
            # Sentinel-2
            nir = image.select('B8')
        else:
            # Pas de NIR disponible
            return snow_ndsi
        
        high_nir = nir.gt(self.nir_threshold)
        
        # Combiner critères
        snow_final = snow_ndsi.And(high_nir).rename('snow_mask')
        
        return snow_final.selfMask()
    
    def calculate_snow_metrics(
        self,
        snow_mask: ee.Image,
        basin_boundary: ee.Geometry,
        dem: ee.Image,
        scale: int = 500
    ) -> Dict:
        """
        Calcule métriques sur couverture neigeuse
        
        Args:
            snow_mask: Masque binaire neige
            basin_boundary: Limite bassin
            dem: MNT
            scale: Résolution calcul
        
        Returns:
            Dictionnaire avec métriques
        """
        # Surface totale bassin
        basin_area = basin_boundary.area().divide(1e6)  # km²
        
        # Surface enneigée
        snow_area = snow_mask.multiply(ee.Image.pixelArea()) \
                             .reduceRegion(
                                 reducer=ee.Reducer.sum(),
                                 geometry=basin_boundary,
                                 scale=scale,
                                 maxPixels=1e10
                             )
        
        snow_area_km2 = ee.Number(snow_area.get('snow_mask')).divide(1e6)
        
        # Pourcentage
        snow_percentage = snow_area_km2.divide(basin_area).multiply(100)
        
        # Altitude moyenne neige
        snow_elevation = snow_mask.multiply(dem.select('elevation'))
        mean_elevation = snow_elevation.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=basin_boundary,
            scale=scale,
            maxPixels=1e10
        )
        
        # Distribution par altitude
        elevation_zones = dem.select('elevation').expression(
            '(elev < 1000) ? 1 : ((elev < 2000) ? 2 : ((elev < 3000) ? 3 : 4))',
            {'elev': dem.select('elevation')}
        ).rename('zone')
        
        snow_by_zone = snow_mask.addBands(elevation_zones) \
                                .reduceRegion(
                                    reducer=ee.Reducer.sum().group(
                                        groupField=1,
                                        groupName='zone'
                                    ),
                                    geometry=basin_boundary,
                                    scale=scale,
                                    maxPixels=1e10
                                )
        
        return {
            'snow_area_km2': snow_area_km2,
            'snow_percentage': snow_percentage,
            'mean_snow_elevation': ee.Number(mean_elevation.get('elevation')),
            'basin_area_km2': basin_area,
            'snow_by_elevation_zone': snow_by_zone
        }
    
    def post_process_snow_mask(
        self,
        snow_mask: ee.Image,
        min_area_pixels: int = 9
    ) -> ee.Image:
        """
        Post-traitement du masque neige
        - Suppression petits clusters
        - Lissage morphologique
        
        Args:
            snow_mask: Masque brut
            min_area_pixels: Surface minimum cluster (pixels)
        
        Returns:
            Masque nettoyé
        """
        # Supprimer petits clusters isolés
        # Connected components
        connected = snow_mask.connectedPixelCount(max_size=256)
        snow_cleaned = snow_mask.updateMask(connected.gte(min_area_pixels))
        
        # Filtre morphologique (fermeture: combler petits trous)
        snow_smoothed = snow_cleaned.focal_max(radius=1, kernelType='square') \
                                   .focal_min(radius=1, kernelType='square')
        
        return snow_smoothed.rename('snow_mask').selfMask()


# Tests
def test_snow_detection():
    """Test détection neige"""
    import logging
    from datetime import datetime, timedelta
    from src.acquisition.data_acquirer import SebouDataAcquirer
    from src.preprocessing.preprocessor import ImagePreprocessor
    import yaml
    
    logging.basicConfig(level=logging.INFO)
    
    # Config
    with open('/opt/sebou_monitoring/config/config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    # Acquérir données
    acquirer = SebouDataAcquirer('/opt/sebou_monitoring/config/config.yaml')
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)
    
    modis_col = acquirer.acquire_modis_snow(start_date, end_date)
    
    if modis_col.size().getInfo() > 0:
        # Prétraiter
        preprocessor = ImagePreprocessor()
        modis_img = modis_col.first()
        modis_processed = preprocessor.preprocess_modis(modis_img)
        
        # Calculer NDSI si pas déjà présent
        detector = SnowDetector(config['processing']['snow_detection'])
        modis_with_ndsi = detector.calculate_ndsi(modis_processed)
        
        # Détection
        aux = acquirer.get_auxiliary_data()
        snow_mask = detector.detect_snow_adaptive(
            modis_with_ndsi, 
            aux['dem'],
            method='multi_criteria'
        )
        
        # Post-traitement
        snow_final = detector.post_process_snow_mask(snow_mask)
        
        # Métriques
        metrics = detector.calculate_snow_metrics(
            snow_final,
            acquirer.basin,
            aux['dem']
        )
        
        print("Métriques neige:")
        print(f"  Surface: {metrics['snow_area_km2'].getInfo():.2f} km²")
        print(f"  Pourcentage: {metrics['snow_percentage'].getInfo():.2f}%")
        print(f"  Altitude moyenne: {metrics['mean_snow_elevation'].getInfo():.0f}m")
        
        print("✅ Tests détection neige réussis!")
    else:
        print("⚠️ Pas d'images MODIS disponibles pour test")


if __name__ == '__main__':
    test_snow_detection()
```

**À SUIVRE**: Le prompt est trop long. Je vais créer la **PARTIE 2** du prompt qui couvrira:
- Détection inondations (SAR + optique)
- Module validation
- Export et stockage
- Pipeline automatisé
- API et dashboard
- Tests et déploiement

Veux-tu que je continue avec la partie 2 du prompt?
