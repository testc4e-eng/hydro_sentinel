# Workflow de Monitoring - Couverture Neigeuse et Zones Inondées
## Bassin du Sebou - Maroc

---

## 1. ARCHITECTURE GLOBALE DU SYSTÈME

### 1.1 Vue d'ensemble
```
Acquisition données → Prétraitement → Traitement thématique → Validation → Visualisation
     ↓                    ↓                  ↓                  ↓            ↓
  Satellites          Corrections        Indices/Masques    Vérification   Dashboard
```

### 1.2 Technologies recommandées
- **Backend**: Python 3.9+ avec environnement conda/venv
- **Traitement**: Google Earth Engine (GEE) ou local avec GDAL/Rasterio
- **Base de données**: PostgreSQL + PostGIS (données vectorielles)
- **Stockage raster**: GeoTIFF avec compression LZW, Cloud Optimized GeoTIFF (COG)
- **Serveur carto**: GeoServer ou MapServer
- **Frontend**: Leaflet/OpenLayers ou solution intégrée (QGIS Server + Lizmap)

---

## 2. ACQUISITION DES DONNÉES

### 2.1 Sources satellitaires pour la neige

#### Option 1: MODIS (Terra/Aqua) - CONTINUITÉ DE VOS TRAVAUX
**Produits recommandés:**
- **MOD10A1/MYD10A1** (500m, quotidien) - Couverture neigeuse
- **MOD10A2/MYD10A2** (500m, 8 jours) - Composite avec moins de nuages
- **MOD09GA/MYD09GA** (500m, quotidien) - Réflectance de surface pour NDSI

**Avantages:**
- Historique depuis 2000
- Résolution temporelle quotidienne
- Produits snow cover validés
- Continuité avec vos exercices manuels

**Téléchargement:**
```python
# Via Earth Engine
import ee
ee.Initialize()

# Définir zone d'intérêt (bassin Sebou)
sebou_basin = ee.FeatureCollection('projects/your-project/assets/sebou_basin')

# Ou via coordonnées
sebou_aoi = ee.Geometry.Polygon([
    [[-5.5, 34.8], [-4.0, 34.8], [-4.0, 33.5], [-5.5, 33.5]]
])

# Charger données MODIS Snow Cover
modis_snow = ee.ImageCollection('MODIS/006/MOD10A1') \
    .filterBounds(sebou_aoi) \
    .filterDate('2024-01-01', '2024-03-31')
```

#### Option 2: Sentinel-2 (10-20m) - HAUTE RÉSOLUTION
**Avantages:**
- Meilleure résolution spatiale (10-20m)
- Gratuit et accessible via Copernicus
- Bon pour détail local

**Limitations:**
- Revisite de 5 jours (peut manquer événements)
- Plus affecté par les nuages

#### Option 3: Landsat 8/9 (30m)
**Avantages:**
- Historique long
- Bande thermique (utile pour validation)
- Gratuit

**Limitations:**
- Revisite de 16 jours

### 2.2 Sources pour les inondations

#### Sentinel-1 (SAR) - RECOMMANDÉ PRIORITAIRE
**Produit:** Sentinel-1 GRD (Ground Range Detected)
**Résolution:** 10m
**Avantages:**
- Pénètre les nuages (crucial pour pluies)
- Sensible à l'eau (faible rétrodiffusion)
- Revisite de 6 jours (constellation)

```python
# Via Earth Engine
s1_collection = ee.ImageCollection('COPERNICUS/S1_GRD') \
    .filterBounds(sebou_aoi) \
    .filterDate('2024-01-01', '2024-03-31') \
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV')) \
    .filter(ee.Filter.eq('instrumentMode', 'IW'))
```

#### Sentinel-2 (optique)
- Backup quand conditions claires
- Indices NDWI, MNDWI

### 2.3 Données auxiliaires essentielles

1. **MNT (Modèle Numérique de Terrain)**
   - SRTM 30m ou ALOS PALSAR 12.5m
   - Pour corrections topographiques et masques

2. **Masques permanents**
   - Plans d'eau permanents (Global Surface Water)
   - Zones urbaines (OpenStreetMap, World Settlement Footprint)
   - Limites du bassin versant

3. **Données in-situ** (validation)
   - Stations météo (température, précipitations)
   - Stations hydrologiques (débits)
   - Observations terrain

---

## 3. PRÉTRAITEMENT DES DONNÉES

### 3.1 Corrections atmosphériques

#### Pour MODIS
```python
def preprocess_modis(image):
    """
    Prétraitement MODIS MOD09GA
    """
    # Sélectionner bandes
    bands = image.select(['sur_refl_b01', 'sur_refl_b02', 'sur_refl_b03', 
                          'sur_refl_b04', 'sur_refl_b06', 'sur_refl_b07'])
    
    # Appliquer facteur d'échelle
    bands = bands.multiply(0.0001)
    
    # Masque de qualité
    qa = image.select('state_1km')
    cloud_mask = qa.bitwiseAnd(1 << 0).eq(0)  # Bit 0: cloud state
    shadow_mask = qa.bitwiseAnd(1 << 2).eq(0)  # Bit 2: cloud shadow
    
    # Appliquer masques
    return bands.updateMask(cloud_mask).updateMask(shadow_mask) \
                .copyProperties(image, ['system:time_start'])
```

#### Pour Sentinel-2
```python
def preprocess_sentinel2(image):
    """
    Correction atmosphérique Sen2Cor (niveau L2A)
    """
    # Sélectionner bandes L2A (déjà corrigées)
    bands = image.select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12'])
    
    # Masque de nuages (SCL - Scene Classification Layer)
    scl = image.select('SCL')
    cloud_free = scl.lt(7)  # Classes 1-6 sont sans nuages
    
    return bands.updateMask(cloud_free).divide(10000) \
                .copyProperties(image, ['system:time_start'])
```

#### Pour Sentinel-1 (SAR)
```python
def preprocess_sentinel1(image):
    """
    Prétraitement SAR avec filtrage speckle
    """
    # Appliquer filtre Lee Sigma (réduit le speckle)
    def lee_sigma_filter(image):
        # Paramètres
        KERNEL_SIZE = 7
        Tk = ee.Image.constant(7)  # Nombre de regards
        
        # Filtre de Lee Sigma
        bandNames = image.bandNames()
        
        # Moyenne et variance locales
        mean = image.reduceNeighborhood(
            reducer=ee.Reducer.mean(),
            kernel=ee.Kernel.square(KERNEL_SIZE/2, 'pixels')
        )
        
        variance = image.reduceNeighborhood(
            reducer=ee.Reducer.variance(),
            kernel=ee.Kernel.square(KERNEL_SIZE/2, 'pixels')
        )
        
        # Coefficient de variation
        cv = variance.sqrt().divide(mean)
        
        # Pondération
        weight = cv.multiply(cv).multiply(Tk.add(1)) \
                  .divide(cv.multiply(cv).multiply(Tk).add(1))
        
        # Filtré
        filtered = mean.multiply(weight).add(image.multiply(weight.multiply(-1).add(1)))
        
        return filtered.rename(bandNames)
    
    # Conversion en dB
    image_db = ee.Image(10).multiply(image.log10())
    
    # Appliquer filtre
    filtered = lee_sigma_filter(image_db)
    
    return filtered.copyProperties(image, ['system:time_start'])
```

### 3.2 Corrections topographiques

```python
def terrain_correction(image, dem):
    """
    Correction des effets topographiques
    """
    # Calculer pente et aspect
    terrain = ee.Algorithms.Terrain(dem)
    slope = terrain.select('slope')
    aspect = terrain.select('aspect')
    
    # Angle solaire (pour optique)
    solar_azimuth = ee.Number(image.get('MEAN_SOLAR_AZIMUTH_ANGLE'))
    solar_zenith = ee.Number(image.get('MEAN_SOLAR_ZENITH_ANGLE'))
    
    # Correction C (Cosine correction)
    cos_i = (solar_zenith.multiply(Math.PI/180).cos()
             .multiply(slope.multiply(Math.PI/180).cos())
             .add(solar_zenith.multiply(Math.PI/180).sin()
                  .multiply(slope.multiply(Math.PI/180).sin())
                  .multiply(aspect.subtract(solar_azimuth)
                           .multiply(Math.PI/180).cos())))
    
    # Appliquer correction
    corrected = image.divide(cos_i)
    
    return corrected
```

---

## 4. TRAITEMENT THÉMATIQUE

### 4.1 Détection de la neige

#### Méthode 1: NDSI (Normalized Difference Snow Index)
```python
def calculate_ndsi(image):
    """
    NDSI = (Green - SWIR) / (Green + SWIR)
    MODIS: B4 (Green), B6 (SWIR)
    Sentinel-2: B3 (Green), B11 (SWIR)
    """
    if 'sur_refl_b04' in image.bandNames().getInfo():
        # MODIS
        green = image.select('sur_refl_b04')
        swir = image.select('sur_refl_b06')
    else:
        # Sentinel-2
        green = image.select('B3')
        swir = image.select('B11')
    
    ndsi = green.subtract(swir).divide(green.add(swir)).rename('NDSI')
    return image.addBands(ndsi)

def snow_mask_robust(image, dem):
    """
    Masque de neige robuste avec critères multiples
    """
    # 1. NDSI
    ndsi = image.select('NDSI')
    
    # 2. Réflectance NIR (neige haute réflectance)
    if 'sur_refl_b02' in image.bandNames().getInfo():
        nir = image.select('sur_refl_b02')  # MODIS B2
        threshold_nir = 0.11
    else:
        nir = image.select('B8')  # Sentinel-2 B8
        threshold_nir = 0.15
    
    # 3. Test de température (si disponible)
    # Pour MODIS, utiliser MOD11 (LST)
    
    # 4. Seuils adaptatifs selon altitude
    elevation = dem.select('elevation')
    
    # Seuil NDSI adaptatif
    # Haute altitude (>2000m): NDSI > 0.4
    # Moyenne altitude (1000-2000m): NDSI > 0.5
    # Basse altitude (<1000m): NDSI > 0.6
    
    ndsi_threshold = elevation.expression(
        '(elev > 2000) ? 0.4 : ((elev > 1000) ? 0.5 : 0.6)',
        {'elev': elevation}
    )
    
    # Masque combiné
    snow = ndsi.gt(ndsi_threshold) \
               .And(nir.gt(threshold_nir))
    
    return snow.rename('snow_mask').selfMask()
```

#### Méthode 2: Classification supervisée (pour amélioration)
```python
from sklearn.ensemble import RandomForestClassifier
import numpy as np

def train_snow_classifier(training_data, labels):
    """
    Entraîner classificateur RF pour neige
    Features: NDSI, NIR, SWIR, elevation, slope
    """
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        class_weight='balanced'
    )
    
    clf.fit(training_data, labels)
    return clf

def apply_snow_classification(image, dem, classifier):
    """
    Appliquer classification
    """
    # Préparer features
    features = ee.Image.cat([
        image.select('NDSI'),
        image.select('B8'),  # NIR
        image.select('B11'), # SWIR
        dem.select('elevation'),
        dem.select('slope')
    ])
    
    # Classification (via Earth Engine ou export local)
    classified = features.classify(classifier)
    
    return classified
```

### 4.2 Détection des inondations

#### Méthode 1: Seuillage SAR (Sentinel-1)
```python
def detect_flooding_sar(before_event, during_event, permanent_water, dem):
    """
    Détection inondations par différence SAR
    """
    # 1. Calculer différence (dB)
    difference = during_event.subtract(before_event).rename('diff')
    
    # 2. Seuil de détection (typiquement -3 à -5 dB)
    # Eau = forte diminution rétrodiffusion
    water_decrease = difference.lt(-4)
    
    # 3. Seuil absolu sur image événement
    # VV polarisation: eau < -15 dB
    absolute_water = during_event.select('VV').lt(-15)
    
    # 4. Combiner critères
    potential_flood = water_decrease.And(absolute_water)
    
    # 5. Enlever plans d'eau permanents
    flood_mask = potential_flood.And(permanent_water.Not())
    
    # 6. Filtres morphologiques
    # Enlever pixels isolés (bruit)
    flood_cleaned = flood_mask.focal_mode(radius=1, kernelType='square')
    
    # 7. Contrainte topographique
    # Inondations uniquement en zones basses et plates
    slope = ee.Terrain.slope(dem)
    flat_areas = slope.lt(5)  # Pente < 5°
    
    flood_final = flood_cleaned.And(flat_areas)
    
    return flood_final.selfMask().rename('flood_mask')
```

#### Méthode 2: Indices optiques (backup)
```python
def calculate_water_indices(image):
    """
    Calculer NDWI et MNDWI
    """
    # NDWI = (Green - NIR) / (Green + NIR)
    green = image.select('B3')
    nir = image.select('B8')
    swir = image.select('B11')
    
    ndwi = green.subtract(nir).divide(green.add(nir)).rename('NDWI')
    
    # MNDWI = (Green - SWIR) / (Green + SWIR)
    # Plus robuste pour séparer eau et bâti
    mndwi = green.subtract(swir).divide(green.add(swir)).rename('MNDWI')
    
    return image.addBands([ndwi, mndwi])

def detect_flooding_optical(image, permanent_water, reference_ndwi):
    """
    Détection inondations par indices optiques
    """
    # MNDWI pour détecter eau
    mndwi = image.select('MNDWI')
    water = mndwi.gt(0.3)  # Seuil typique pour eau
    
    # Enlever eau permanente
    flood = water.And(permanent_water.Not())
    
    # Changement par rapport à référence
    ndwi = image.select('NDWI')
    ndwi_change = ndwi.subtract(reference_ndwi)
    significant_change = ndwi_change.gt(0.1)
    
    flood_final = flood.And(significant_change)
    
    return flood_final.selfMask()
```

### 4.3 Indicateurs et statistiques

```python
def calculate_snow_metrics(snow_mask, basin_boundary, dem):
    """
    Calculer métriques couverture neigeuse
    """
    # 1. Surface enneigée totale
    snow_area = snow_mask.multiply(ee.Image.pixelArea()) \
                         .reduceRegion(
                             reducer=ee.Reducer.sum(),
                             geometry=basin_boundary,
                             scale=500,
                             maxPixels=1e9
                         ).get('snow_mask')
    
    # 2. Pourcentage du bassin
    basin_area = basin_boundary.area()
    snow_percentage = ee.Number(snow_area).divide(basin_area).multiply(100)
    
    # 3. Altitude moyenne de la ligne de neige (snowline)
    snow_elevation = snow_mask.multiply(dem.select('elevation'))
    
    mean_snow_elevation = snow_elevation.reduceRegion(
        reducer=ee.Reducer.mean(),
        geometry=basin_boundary,
        scale=500,
        maxPixels=1e9
    ).get('elevation')
    
    # 4. Distribution par tranche d'altitude
    elevation_zones = dem.select('elevation').expression(
        '(elev < 1000) ? 1 : ((elev < 2000) ? 2 : ((elev < 3000) ? 3 : 4))',
        {'elev': dem.select('elevation')}
    )
    
    snow_by_zone = snow_mask.addBands(elevation_zones.rename('zone')) \
                            .reduceRegion(
                                reducer=ee.Reducer.sum().group(
                                    groupField=1,
                                    groupName='elevation_zone'
                                ),
                                geometry=basin_boundary,
                                scale=500,
                                maxPixels=1e9
                            )
    
    return {
        'snow_area_km2': ee.Number(snow_area).divide(1e6),
        'snow_percentage': snow_percentage,
        'mean_snow_elevation': mean_snow_elevation,
        'snow_by_elevation': snow_by_zone
    }

def calculate_flood_metrics(flood_mask, basin_boundary, admin_boundaries):
    """
    Calculer métriques inondations
    """
    # 1. Surface inondée
    flood_area = flood_mask.multiply(ee.Image.pixelArea()) \
                          .reduceRegion(
                              reducer=ee.Reducer.sum(),
                              geometry=basin_boundary,
                              scale=10,
                              maxPixels=1e10
                          ).get('flood_mask')
    
    # 2. Par commune/province
    flood_by_admin = flood_mask.reduceRegions(
        collection=admin_boundaries,
        reducer=ee.Reducer.sum().combine(
            reducer2=ee.Reducer.count(),
            sharedInputs=True
        ),
        scale=10
    )
    
    # 3. Population potentiellement affectée
    # (si données population disponibles)
    
    return {
        'flood_area_km2': ee.Number(flood_area).divide(1e6),
        'affected_areas': flood_by_admin
    }
```

---

## 5. VALIDATION ET CONTRÔLE QUALITÉ

### 5.1 Validation croisée multi-sources

```python
def cross_validate_snow(modis_snow, sentinel2_snow, date_tolerance=1):
    """
    Validation croisée MODIS vs Sentinel-2
    """
    # Rééchantillonner Sentinel-2 à résolution MODIS
    s2_resampled = sentinel2_snow.reduceResolution(
        reducer=ee.Reducer.mean(),
        maxPixels=1024
    ).reproject(
        crs=modis_snow.projection(),
        scale=500
    )
    
    # Accord entre sources
    agreement = modis_snow.And(s2_resampled)
    disagreement = modis_snow.neq(s2_resampled)
    
    # Statistiques
    total_pixels = modis_snow.reduceRegion(
        reducer=ee.Reducer.count(),
        scale=500,
        maxPixels=1e9
    )
    
    agreement_pixels = agreement.reduceRegion(
        reducer=ee.Reducer.sum(),
        scale=500,
        maxPixels=1e9
    )
    
    agreement_rate = ee.Number(agreement_pixels.get('snow_mask')) \
                       .divide(total_pixels.get('snow_mask'))
    
    return {
        'agreement_map': agreement,
        'disagreement_map': disagreement,
        'agreement_rate': agreement_rate
    }
```

### 5.2 Validation avec données in-situ

```python
def validate_with_stations(snow_mask, station_points):
    """
    Validation avec observations stations météo
    station_points: FeatureCollection avec propriété 'snow_observed' (0/1)
    """
    # Extraire valeurs prédites aux points
    predicted = snow_mask.reduceRegions(
        collection=station_points,
        reducer=ee.Reducer.first(),
        scale=500
    )
    
    # Calculer matrice de confusion
    def calc_confusion_matrix(feature):
        observed = ee.Number(feature.get('snow_observed'))
        predicted = ee.Number(feature.get('first'))
        
        # True Positive
        tp = observed.And(predicted)
        # False Positive
        fp = observed.Not().And(predicted)
        # True Negative
        tn = observed.Not().And(predicted.Not())
        # False Negative
        fn = observed.And(predicted.Not())
        
        return feature.set({
            'TP': tp,
            'FP': fp,
            'TN': tn,
            'FN': fn
        })
    
    confusion = predicted.map(calc_confusion_matrix)
    
    # Agréger
    stats = confusion.aggregate_array('TP').size()
    
    # Calculer métriques
    # Accuracy = (TP + TN) / (TP + TN + FP + FN)
    # Precision = TP / (TP + FP)
    # Recall = TP / (TP + FN)
    # F1-Score = 2 * (Precision * Recall) / (Precision + Recall)
    
    return confusion
```

### 5.3 Détection d'anomalies

```python
def detect_anomalies(current_image, historical_mean, historical_std):
    """
    Détecter valeurs anormales (Z-score)
    """
    z_score = current_image.subtract(historical_mean) \
                          .divide(historical_std)
    
    # Anomalies: |Z| > 2
    anomalies = z_score.abs().gt(2)
    
    return {
        'z_score': z_score,
        'anomalies': anomalies,
        'high_anomalies': z_score.gt(2),  # Beaucoup plus que normale
        'low_anomalies': z_score.lt(-2)   # Beaucoup moins que normale
    }

def temporal_consistency_check(image_series):
    """
    Vérifier cohérence temporelle
    """
    # Détection de changements brusques irréalistes
    def calc_difference(image):
        previous = ee.Image(image.get('previous'))
        diff = image.subtract(previous).abs()
        
        # Seuil de changement réaliste (ex: 30% de pixels)
        max_change = 0.3
        suspicious = diff.gt(max_change)
        
        return image.set('suspicious_change', suspicious.reduceRegion(
            reducer=ee.Reducer.mean(),
            scale=500,
            maxPixels=1e9
        ))
    
    # Appliquer
    checked = image_series.map(calc_difference)
    
    return checked
```

### 5.4 Rapports de qualité automatisés

```python
def generate_quality_report(image, mask, basin):
    """
    Générer rapport qualité
    """
    report = {
        'date': image.date().format('YYYY-MM-dd'),
        'sensor': image.get('SPACECRAFT_NAME'),
        'cloud_cover': None,
        'data_coverage': None,
        'quality_flags': []
    }
    
    # 1. Couverture nuageuse
    if 'CLOUDY_PIXEL_PERCENTAGE' in image.propertyNames().getInfo():
        report['cloud_cover'] = image.get('CLOUDY_PIXEL_PERCENTAGE')
    
    # 2. Couverture spatiale (% bassin couvert)
    valid_pixels = mask.reduceRegion(
        reducer=ee.Reducer.count(),
        geometry=basin,
        scale=500,
        maxPixels=1e9
    )
    
    total_pixels = ee.Image.constant(1).reduceRegion(
        reducer=ee.Reducer.count(),
        geometry=basin,
        scale=500,
        maxPixels=1e9
    )
    
    report['data_coverage'] = ee.Number(valid_pixels.values().get(0)) \
                               .divide(total_pixels.values().get(0)) \
                               .multiply(100)
    
    # 3. Flags qualité
    if report['data_coverage'] < 80:
        report['quality_flags'].append('LOW_SPATIAL_COVERAGE')
    
    if report['cloud_cover'] > 30:
        report['quality_flags'].append('HIGH_CLOUD_COVER')
    
    return report
```

---

## 6. EXPORT ET STOCKAGE

### 6.1 Export optimisé

```python
def export_to_geotiff(image, region, description, scale=500):
    """
    Export optimisé en Cloud Optimized GeoTIFF
    """
    task = ee.batch.Export.image.toDrive({
        'image': image.toFloat(),
        'description': description,
        'folder': 'Sebou_Monitoring',
        'region': region,
        'scale': scale,
        'crs': 'EPSG:32629',  # UTM Zone 29N (Maroc)
        'fileFormat': 'GeoTIFF',
        'formatOptions': {
            'cloudOptimized': True,
            'compression': 'DEFLATE'
        },
        'maxPixels': 1e10
    })
    
    task.start()
    return task

def export_to_postgis(features, table_name):
    """
    Export vers PostGIS
    """
    import geopandas as gpd
    from sqlalchemy import create_engine
    
    # Convertir en GeoDataFrame
    gdf = gpd.GeoDataFrame.from_features(features)
    
    # Connexion base de données
    engine = create_engine(
        'postgresql://user:password@localhost:5432/sebou_monitoring'
    )
    
    # Insérer
    gdf.to_postgis(
        name=table_name,
        con=engine,
        if_exists='append',
        index=False
    )
```

### 6.2 Structure de stockage recommandée

```
/data/sebou_monitoring/
├── raw/                          # Données brutes
│   ├── modis/
│   │   ├── 2024/
│   │   │   ├── 001/  (DOY)
│   │   │   └── 002/
│   ├── sentinel1/
│   └── sentinel2/
├── processed/                    # Données traitées
│   ├── snow/
│   │   ├── daily/
│   │   ├── weekly/
│   │   └── monthly/
│   └── flood/
│       ├── events/
│       └── risk_maps/
├── validation/                   # Données validation
│   ├── stations/
│   ├── field_observations/
│   └── quality_reports/
├── products/                     # Produits finaux
│   ├── cog/                     # Cloud Optimized GeoTIFF
│   ├── vectors/                 # Shapefiles, GeoJSON
│   └── statistics/              # CSV, JSON
└── metadata/                    # Métadonnées
    ├── catalog.json
    └── processing_logs/
```

---

## 7. PIPELINE AUTOMATISÉ

### 7.1 Architecture du pipeline

```python
# pipeline_config.yaml
pipeline:
  name: "Sebou Snow and Flood Monitoring"
  schedule: "0 6 * * *"  # Tous les jours à 6h
  
  sources:
    - name: "MODIS_Snow"
      product: "MOD10A1"
      lag_days: 1  # Données J-1
    - name: "Sentinel1_SAR"
      product: "S1_GRD"
      lag_days: 2
  
  processing:
    - step: "preprocessing"
      parallel: true
    - step: "snow_detection"
      depends_on: ["preprocessing"]
    - step: "flood_detection"
      depends_on: ["preprocessing"]
      trigger_condition: "precipitation > 30mm"
    - step: "validation"
      depends_on: ["snow_detection", "flood_detection"]
    - step: "export"
      depends_on: ["validation"]
  
  outputs:
    - format: "COG"
      destination: "/data/sebou_monitoring/products/cog/"
    - format: "GeoJSON"
      destination: "postgis"
    - format: "PNG"
      destination: "/data/sebou_monitoring/products/thumbnails/"
  
  notifications:
    - type: "email"
      trigger: "quality_flag"
      recipients: ["equipe@example.com"]
    - type: "alert"
      trigger: "flood_detected"
      recipients: ["urgent@example.com"]
```

### 7.2 Script orchestration

```python
# main_pipeline.py
import ee
import schedule
import time
from datetime import datetime, timedelta
import yaml
import logging

# Configuration logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/sebou_pipeline.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class SebouMonitoringPipeline:
    def __init__(self, config_path):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        ee.Initialize()
        self.basin = self.load_basin_boundary()
        self.dem = ee.Image('USGS/SRTMGL1_003')
    
    def load_basin_boundary(self):
        """Charger limite bassin Sebou"""
        # Option 1: Depuis Earth Engine Asset
        # return ee.FeatureCollection('projects/your-project/assets/sebou_basin')
        
        # Option 2: Depuis fichier
        import geopandas as gpd
        gdf = gpd.read_file('/data/sebou_monitoring/vectors/sebou_basin.shp')
        return ee.FeatureCollection(gdf.__geo_interface__)
    
    def run_daily_processing(self):
        """Traitement quotidien"""
        try:
            logger.info("Starting daily processing")
            
            # Date de traitement
            date = datetime.now() - timedelta(days=1)
            date_str = date.strftime('%Y-%m-%d')
            
            # 1. Acquisition données
            logger.info("Acquiring satellite data")
            modis_image = self.acquire_modis(date)
            s1_image = self.acquire_sentinel1(date)
            
            # 2. Prétraitement
            logger.info("Preprocessing")
            modis_preprocessed = self.preprocess_modis(modis_image)
            s1_preprocessed = self.preprocess_sentinel1(s1_image)
            
            # 3. Détection neige
            logger.info("Detecting snow cover")
            snow_mask = self.detect_snow(modis_preprocessed)
            snow_metrics = self.calculate_snow_metrics(snow_mask)
            
            # 4. Détection inondations (si précipitations)
            logger.info("Checking flood conditions")
            if self.check_flood_trigger(date):
                logger.info("Flood detection triggered")
                flood_mask = self.detect_flooding(s1_preprocessed)
                flood_metrics = self.calculate_flood_metrics(flood_mask)
            else:
                flood_mask = None
                flood_metrics = None
            
            # 5. Validation
            logger.info("Validation")
            quality_report = self.validate_results(
                snow_mask, flood_mask, date
            )
            
            # 6. Export
            logger.info("Exporting results")
            self.export_results(
                date_str, snow_mask, flood_mask, 
                snow_metrics, flood_metrics, quality_report
            )
            
            # 7. Notification
            logger.info("Sending notifications")
            self.send_notifications(quality_report, flood_metrics)
            
            logger.info("Daily processing completed successfully")
            
        except Exception as e:
            logger.error(f"Error in daily processing: {str(e)}", exc_info=True)
            self.send_error_notification(str(e))
    
    def acquire_modis(self, date):
        """Acquérir données MODIS"""
        # Implementation from section 2
        pass
    
    def check_flood_trigger(self, date):
        """Vérifier si conditions inondation"""
        # Requête vers API météo ou base de données
        # Retourne True si précipitations > seuil
        pass
    
    def send_notifications(self, quality_report, flood_metrics):
        """Envoyer notifications"""
        # Email si problème qualité
        if quality_report['quality_flags']:
            self.send_email(
                subject="Alerte qualité - Monitoring Sebou",
                body=f"Flags détectés: {quality_report['quality_flags']}"
            )
        
        # Alerte si inondation détectée
        if flood_metrics and flood_metrics['flood_area_km2'] > 1.0:
            self.send_alert(
                subject="URGENT: Inondation détectée - Bassin Sebou",
                body=f"Surface inondée: {flood_metrics['flood_area_km2']:.2f} km²"
            )

# Lancement
if __name__ == "__main__":
    pipeline = SebouMonitoringPipeline('pipeline_config.yaml')
    
    # Exécution immédiate (test)
    # pipeline.run_daily_processing()
    
    # Planification quotidienne
    schedule.every().day.at("06:00").do(pipeline.run_daily_processing)
    
    logger.info("Pipeline scheduled. Running...")
    
    while True:
        schedule.run_pending()
        time.sleep(60)
```

---

## 8. DASHBOARD ET VISUALISATION

### 8.1 Backend cartographique

#### Option 1: GeoServer
```xml
<!-- Configuration layer neige -->
<layer>
  <name>sebou_snow_daily</name>
  <type>RASTER</type>
  <data>/data/sebou_monitoring/products/cog/snow_${date}.tif</data>
  <style>
    <name>snow_coverage</name>
    <colorMap>
      <entry color="#ffffff" quantity="0" label="Pas de neige" opacity="0"/>
      <entry color="#00BFFF" quantity="1" label="Neige" opacity="0.8"/>
    </colorMap>
  </style>
</layer>
```

#### Option 2: Serveur tuiles vectorielles (Tegola/pg_tileserv)
```yaml
# tegola.toml
[[providers]]
name = "postgis"
type = "postgis"
host = "localhost"
port = 5432
database = "sebou_monitoring"
user = "user"
password = "password"

[[maps]]
name = "sebou_monitoring"

  [[maps.layers]]
  provider_layer = "postgis.snow_cover"
  min_zoom = 7
  max_zoom = 16
  
  [[maps.layers]]
  provider_layer = "postgis.flood_extent"
  min_zoom = 7
  max_zoom = 16
```

### 8.2 Frontend dashboard

```html
<!DOCTYPE html>
<html>
<head>
    <title>Dashboard Monitoring - Bassin Sebou</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.min.css">
    <style>
        body { margin: 0; font-family: Arial, sans-serif; }
        #map { height: 70vh; }
        #controls { padding: 20px; background: #f5f5f5; }
        #stats { display: flex; gap: 20px; padding: 20px; }
        .stat-card { 
            flex: 1; 
            background: white; 
            padding: 20px; 
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-value { font-size: 2em; font-weight: bold; color: #2196F3; }
        .stat-label { color: #666; margin-top: 5px; }
        #timeline { padding: 20px; }
        .legend { 
            padding: 10px; 
            background: white; 
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .legend-item { display: flex; align-items: center; margin: 5px 0; }
        .legend-color { 
            width: 20px; 
            height: 20px; 
            margin-right: 10px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div id="controls">
        <h1>🏔️ Monitoring Bassin du Sebou</h1>
        <label>Date: <input type="date" id="date-picker" /></label>
        <label>
            <input type="checkbox" id="toggle-snow" checked /> Couverture neigeuse
        </label>
        <label>
            <input type="checkbox" id="toggle-flood" checked /> Zones inondées
        </label>
        <button id="refresh-data">🔄 Actualiser</button>
    </div>
    
    <div id="stats">
        <div class="stat-card">
            <div class="stat-value" id="snow-area">--</div>
            <div class="stat-label">km² enneigés</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" id="snow-percentage">--</div>
            <div class="stat-label">% du bassin</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" id="flood-area">--</div>
            <div class="stat-label">km² inondés</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" id="data-quality">--</div>
            <div class="stat-label">Qualité données</div>
        </div>
    </div>
    
    <div id="map"></div>
    
    <div id="timeline">
        <h3>Évolution temporelle</h3>
        <canvas id="chart-timeline"></canvas>
    </div>
    
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script>
        // Initialisation carte
        const map = L.map('map').setView([34.2, -5.0], 9);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        // Couches de données
        let snowLayer, floodLayer;
        
        // Légende
        const legend = L.control({position: 'bottomright'});
        legend.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'legend');
            div.innerHTML = `
                <div class="legend-item">
                    <div class="legend-color" style="background: #00BFFF;"></div>
                    <span>Couverture neigeuse</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #FF4444;"></div>
                    <span>Zones inondées</span>
                </div>
            `;
            return div;
        };
        legend.addTo(map);
        
        // Fonction chargement données
        async function loadData(date) {
            const dateStr = date.toISOString().split('T')[0];
            
            // Charger couche neige (WMS GeoServer)
            if (document.getElementById('toggle-snow').checked) {
                if (snowLayer) map.removeLayer(snowLayer);
                
                snowLayer = L.tileLayer.wms('http://your-geoserver/geoserver/sebou/wms', {
                    layers: 'sebou:snow_daily',
                    format: 'image/png',
                    transparent: true,
                    time: dateStr,
                    opacity: 0.7
                }).addTo(map);
            }
            
            // Charger couche inondations (GeoJSON depuis PostGIS)
            if (document.getElementById('toggle-flood').checked) {
                const response = await fetch(`/api/flood/${dateStr}`);
                const geojson = await response.json();
                
                if (floodLayer) map.removeLayer(floodLayer);
                
                floodLayer = L.geoJSON(geojson, {
                    style: {
                        color: '#FF4444',
                        fillOpacity: 0.5
                    },
                    onEachFeature: (feature, layer) => {
                        layer.bindPopup(`
                            <b>Zone inondée</b><br>
                            Surface: ${feature.properties.area_km2.toFixed(2)} km²
                        `);
                    }
                }).addTo(map);
            }
            
            // Charger statistiques
            const stats = await fetch(`/api/stats/${dateStr}`).then(r => r.json());
            
            document.getElementById('snow-area').textContent = 
                stats.snow_area_km2.toFixed(1);
            document.getElementById('snow-percentage').textContent = 
                stats.snow_percentage.toFixed(1) + '%';
            document.getElementById('flood-area').textContent = 
                stats.flood_area_km2 ? stats.flood_area_km2.toFixed(1) : '0';
            document.getElementById('data-quality').textContent = 
                stats.quality_score.toFixed(0) + '%';
        }
        
        // Graphique évolution temporelle
        const ctx = document.getElementById('chart-timeline');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Couverture neigeuse (km²)',
                    data: [],
                    borderColor: '#00BFFF',
                    backgroundColor: 'rgba(0, 191, 255, 0.1)',
                    yAxisID: 'y',
                }, {
                    label: 'Zones inondées (km²)',
                    data: [],
                    borderColor: '#FF4444',
                    backgroundColor: 'rgba(255, 68, 68, 0.1)',
                    yAxisID: 'y',
                }]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                    }
                }
            }
        });
        
        // Charger série temporelle
        async function loadTimeSeries() {
            const response = await fetch('/api/timeseries?days=90');
            const data = await response.json();
            
            chart.data.labels = data.dates;
            chart.data.datasets[0].data = data.snow_area;
            chart.data.datasets[1].data = data.flood_area;
            chart.update();
        }
        
        // Event handlers
        document.getElementById('date-picker').addEventListener('change', (e) => {
            loadData(new Date(e.target.value));
        });
        
        document.getElementById('refresh-data').addEventListener('click', () => {
            const date = new Date(document.getElementById('date-picker').value);
            loadData(date);
            loadTimeSeries();
        });
        
        document.getElementById('toggle-snow').addEventListener('change', () => {
            const date = new Date(document.getElementById('date-picker').value);
            loadData(date);
        });
        
        document.getElementById('toggle-flood').addEventListener('change', () => {
            const date = new Date(document.getElementById('date-picker').value);
            loadData(date);
        });
        
        // Initialisation
        document.getElementById('date-picker').valueAsDate = new Date();
        loadData(new Date());
        loadTimeSeries();
    </script>
</body>
</html>
```

### 8.3 API REST backend

```python
# api.py - FastAPI
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime, date
import geopandas as gpd
from sqlalchemy import create_engine
import json

app = FastAPI(title="Sebou Monitoring API")

# Connexion base de données
engine = create_engine('postgresql://user:password@localhost:5432/sebou_monitoring')

@app.get("/api/stats/{date}")
async def get_daily_stats(date: str):
    """Récupérer statistiques journalières"""
    query = f"""
        SELECT 
            date,
            snow_area_km2,
            snow_percentage,
            flood_area_km2,
            quality_score
        FROM daily_statistics
        WHERE date = '{date}'
    """
    
    with engine.connect() as conn:
        result = conn.execute(query).fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="Data not found")
    
    return {
        "date": result[0],
        "snow_area_km2": result[1],
        "snow_percentage": result[2],
        "flood_area_km2": result[3] or 0,
        "quality_score": result[4]
    }

@app.get("/api/flood/{date}")
async def get_flood_extent(date: str):
    """Récupérer géométries zones inondées"""
    query = f"""
        SELECT 
            id,
            ST_AsGeoJSON(geom) as geometry,
            area_km2,
            detection_confidence
        FROM flood_extents
        WHERE date = '{date}'
    """
    
    with engine.connect() as conn:
        results = conn.execute(query).fetchall()
    
    features = []
    for row in results:
        features.append({
            "type": "Feature",
            "geometry": json.loads(row[1]),
            "properties": {
                "id": row[0],
                "area_km2": row[2],
                "confidence": row[3]
            }
        })
    
    return {
        "type": "FeatureCollection",
        "features": features
    }

@app.get("/api/timeseries")
async def get_time_series(days: int = 90):
    """Récupérer série temporelle"""
    query = f"""
        SELECT 
            date,
            snow_area_km2,
            COALESCE(flood_area_km2, 0) as flood_area_km2
        FROM daily_statistics
        WHERE date >= CURRENT_DATE - INTERVAL '{days} days'
        ORDER BY date
    """
    
    with engine.connect() as conn:
        results = conn.execute(query).fetchall()
    
    return {
        "dates": [str(row[0]) for row in results],
        "snow_area": [float(row[1]) for row in results],
        "flood_area": [float(row[2]) for row in results]
    }

@app.get("/api/alerts")
async def get_active_alerts():
    """Récupérer alertes actives"""
    query = """
        SELECT 
            alert_type,
            severity,
            message,
            created_at,
            affected_area_km2
        FROM alerts
        WHERE status = 'active'
        ORDER BY created_at DESC
    """
    
    with engine.connect() as conn:
        results = conn.execute(query).fetchall()
    
    return [
        {
            "type": row[0],
            "severity": row[1],
            "message": row[2],
            "timestamp": str(row[3]),
            "area_km2": row[4]
        }
        for row in results
    ]
```

---

## 9. CHECKLIST DE DÉPLOIEMENT

### Phase 1: Infrastructure (Semaine 1-2)
- [ ] Serveur Linux (Ubuntu 20.04/22.04) avec 32GB RAM minimum
- [ ] PostgreSQL 14+ avec extension PostGIS 3.x
- [ ] Python 3.9+ avec environnements virtuels
- [ ] Compte Google Earth Engine
- [ ] Espace stockage: 500GB minimum (évolutif)
- [ ] GeoServer ou alternative installé et configuré

### Phase 2: Données de base (Semaine 2-3)
- [ ] Limite bassin Sebou vectorisée (shapefile/GeoJSON)
- [ ] MNT de référence (SRTM/ALOS)
- [ ] Masques permanents (eau, urbain)
- [ ] Découpage administratif (provinces, communes)
- [ ] Stations météo/hydro avec historique

### Phase 3: Développement pipeline (Semaine 3-6)
- [ ] Scripts acquisition données testés
- [ ] Module prétraitement validé
- [ ] Algorithmes détection neige implémentés
- [ ] Algorithmes détection inondations implémentés
- [ ] Tests validation avec données historiques
- [ ] Pipeline automatisé fonctionnel

### Phase 4: Dashboard (Semaine 6-8)
- [ ] API REST déployée
- [ ] Interface cartographique testée
- [ ] Graphiques et statistiques validés
- [ ] Système d'alertes opérationnel

### Phase 5: Production (Semaine 8+)
- [ ] Documentation utilisateur complète
- [ ] Formation équipe métier
- [ ] Monitoring système mis en place
- [ ] Procédures backup définies
- [ ] Plan maintenance établi

---

## 10. INDICATEURS DE PERFORMANCE

### KPIs techniques
- **Latence traitement**: < 2h après disponibilité données
- **Disponibilité système**: > 99%
- **Couverture spatiale**: > 90% du bassin
- **Précision neige**: > 85% (validation stations)
- **Précision inondations**: > 80% (validation terrain)

### KPIs opérationnels
- **Fréquence mise à jour**: Quotidienne pour neige, événementielle pour inondations
- **Temps réponse alerte**: < 30 minutes
- **Taux de fausses alertes**: < 10%
- **Satisfaction utilisateurs**: > 4/5

---

## CONCLUSION

Ce workflow propose une solution robuste et opérationnelle qui:

✅ **S'appuie sur vos travaux existants** (MODIS) tout en permettant l'évolution
✅ **Intègre corrections et validations multiples** pour résultats fiables
✅ **Est automatisable** avec monitoring continu
✅ **Produit des sorties cartographiques** directement exploitables
✅ **Inclut des outils de validation** pour garantir la qualité

**Prochaines étapes recommandées:**
1. Valider le périmètre fonctionnel avec l'équipe métier
2. Mettre en place l'infrastructure de base
3. Développer MVP sur période test (ex: hiver 2024-2025)
4. Itérer et améliorer sur base des retours terrain
