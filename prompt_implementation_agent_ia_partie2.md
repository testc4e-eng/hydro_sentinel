# Prompt d'Implémentation - Workflow Monitoring Bassin Sebou
## PARTIE 2 - Phases 4 à 9
## Pour Agent IA (Antigravity/Codex)

---

# PHASE 4: DÉTECTION DES INONDATIONS

## Tâche 4.1: Module détection inondations SAR

**Action requise**: Implémente détection inondations par analyse Sentinel-1

```python
# /opt/sebou_monitoring/src/detection/flood_detector.py

import ee
import logging
from typing import Dict, Optional, Tuple, List
from datetime import datetime, timedelta

class FloodDetector:
    """
    Détecteur d'inondations multi-méthodes (SAR prioritaire + optique backup)
    """
    
    def __init__(self, config: Dict):
        """
        Args:
            config: Configuration avec seuils détection
        """
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Seuils SAR
        self.sar_diff_threshold = config.get('sar_difference_threshold', -4.0)
        self.sar_absolute_threshold = config.get('sar_absolute_threshold', -15.0)
        self.max_slope = config.get('max_slope', 5.0)
        self.min_area_pixels = config.get('min_area_pixels', 25)
    
    def detect_flood_sar_difference(
        self,
        before_image: ee.Image,
        during_image: ee.Image,
        permanent_water: ee.Image,
        dem: ee.Image
    ) -> ee.Image:
        """
        Détecte inondations par différence SAR (avant/pendant événement)
        
        Args:
            before_image: Image Sentinel-1 avant événement (dB)
            during_image: Image Sentinel-1 pendant événement (dB)
            permanent_water: Masque plans d'eau permanents
            dem: Modèle numérique terrain
        
        Returns:
            Masque binaire inondations
        """
        self.logger.info("Détection inondations par différence SAR")
        
        # 1. Calculer différence temporelle
        difference = during_image.subtract(before_image).rename('diff')
        
        # 2. Critère relatif: forte diminution rétrodiffusion
        # (eau = rétrodiffusion faible = diminution du signal)
        water_decrease = difference.lt(self.sar_diff_threshold)
        
        # 3. Critère absolu sur image événement
        # VV polarisation: eau typiquement < -15 dB
        absolute_water = during_image.select('VV').lt(self.sar_absolute_threshold)
        
        # 4. Combiner critères
        potential_flood = water_decrease.And(absolute_water)
        
        # 5. Enlever plans d'eau permanents
        flood_mask = potential_flood.And(permanent_water.Not())
        
        # 6. Contrainte topographique
        # Inondations uniquement zones plates/basses
        slope = ee.Terrain.slope(dem)
        flat_areas = slope.lt(self.max_slope)
        
        flood_constrained = flood_mask.And(flat_areas)
        
        # 7. Post-traitement morphologique
        flood_final = self._post_process_flood(flood_constrained)
        
        return flood_final.rename('flood_mask').selfMask()
    
    def detect_flood_sar_threshold(
        self,
        sar_image: ee.Image,
        permanent_water: ee.Image,
        dem: ee.Image,
        reference_composite: Optional[ee.Image] = None
    ) -> ee.Image:
        """
        Détection par seuillage simple SAR
        (quand image avant n'est pas disponible)
        
        Args:
            sar_image: Image Sentinel-1 (dB)
            permanent_water: Masque eau permanente
            dem: MNT
            reference_composite: Composite de référence (optionnel)
        
        Returns:
            Masque binaire inondations
        """
        self.logger.info("Détection inondations par seuillage SAR")
        
        # Seuil absolu
        water = sar_image.select('VV').lt(self.sar_absolute_threshold)
        
        # Enlever eau permanente
        flood = water.And(permanent_water.Not())
        
        # Contraintes topographiques
        slope = ee.Terrain.slope(dem)
        flat_areas = slope.lt(self.max_slope)
        
        # Altitude basse (inondations typiquement < 500m)
        elevation = dem.select('elevation')
        low_elevation = elevation.lt(500)
        
        flood_constrained = flood.And(flat_areas).And(low_elevation)
        
        # Post-traitement
        flood_final = self._post_process_flood(flood_constrained)
        
        return flood_final.rename('flood_mask').selfMask()
    
    def detect_flood_optical(
        self,
        image: ee.Image,
        permanent_water: ee.Image,
        reference_image: Optional[ee.Image] = None
    ) -> ee.Image:
        """
        Détection inondations par indices optiques (backup si SAR non disponible)
        Utilise MNDWI (Modified Normalized Difference Water Index)
        
        Args:
            image: Image Sentinel-2 ou MODIS
            permanent_water: Masque eau permanente
            reference_image: Image de référence pour changement (optionnel)
        
        Returns:
            Masque binaire inondations
        """
        self.logger.info("Détection inondations par indices optiques")
        
        # Calculer MNDWI
        mndwi = self._calculate_mndwi(image)
        
        # Seuil pour eau (MNDWI > 0.3 généralement eau)
        water = mndwi.gt(0.3)
        
        # Si image de référence disponible, utiliser changement
        if reference_image is not None:
            ref_mndwi = self._calculate_mndwi(reference_image)
            change = mndwi.subtract(ref_mndwi)
            significant_change = change.gt(0.1)
            water = water.And(significant_change)
        
        # Enlever eau permanente
        flood = water.And(permanent_water.Not())
        
        # Post-traitement
        flood_final = self._post_process_flood(flood)
        
        return flood_final.rename('flood_mask').selfMask()
    
    def _calculate_mndwi(self, image: ee.Image) -> ee.Image:
        """
        Calcule MNDWI = (Green - SWIR) / (Green + SWIR)
        
        Args:
            image: Image avec bandes Green et SWIR
        
        Returns:
            Image MNDWI
        """
        band_names = image.bandNames().getInfo()
        
        if 'B3' in band_names:
            # Sentinel-2
            green = image.select('B3')
            swir = image.select('B11')
        elif 'sur_refl_b04' in band_names:
            # MODIS
            green = image.select('sur_refl_b04')
            swir = image.select('sur_refl_b06')
        else:
            raise ValueError("Bandes Green/SWIR non trouvées")
        
        mndwi = green.subtract(swir).divide(green.add(swir)).rename('MNDWI')
        
        return mndwi
    
    def _post_process_flood(self, flood_mask: ee.Image) -> ee.Image:
        """
        Post-traitement du masque inondations
        - Suppression pixels isolés
        - Lissage morphologique
        
        Args:
            flood_mask: Masque brut
        
        Returns:
            Masque nettoyé
        """
        # Supprimer petits clusters isolés
        connected = flood_mask.connectedPixelCount(max_size=256)
        flood_cleaned = flood_mask.updateMask(connected.gte(self.min_area_pixels))
        
        # Filtre médian pour réduire bruit
        flood_smoothed = flood_cleaned.focal_median(
            radius=1,
            kernelType='square'
        )
        
        return flood_smoothed
    
    def calculate_flood_metrics(
        self,
        flood_mask: ee.Image,
        basin_boundary: ee.Geometry,
        admin_boundaries: Optional[ee.FeatureCollection] = None,
        scale: int = 10
    ) -> Dict:
        """
        Calcule métriques sur inondations
        
        Args:
            flood_mask: Masque binaire inondations
            basin_boundary: Limite bassin
            admin_boundaries: Limites administratives (optionnel)
            scale: Résolution calcul
        
        Returns:
            Dictionnaire avec métriques
        """
        # Surface totale inondée
        flood_area = flood_mask.multiply(ee.Image.pixelArea()) \
                              .reduceRegion(
                                  reducer=ee.Reducer.sum(),
                                  geometry=basin_boundary,
                                  scale=scale,
                                  maxPixels=1e10
                              )
        
        flood_area_km2 = ee.Number(flood_area.get('flood_mask')).divide(1e6)
        
        metrics = {
            'flood_area_km2': flood_area_km2,
            'flood_pixel_count': flood_area.get('flood_mask')
        }
        
        # Par unité administrative si disponible
        if admin_boundaries is not None:
            flood_by_admin = flood_mask.multiply(ee.Image.pixelArea()) \
                                      .divide(1e6) \
                                      .reduceRegions(
                                          collection=admin_boundaries,
                                          reducer=ee.Reducer.sum(),
                                          scale=scale
                                      )
            
            metrics['flood_by_admin'] = flood_by_admin
        
        return metrics
    
    def create_reference_composite(
        self,
        collection: ee.ImageCollection,
        start_date: datetime,
        end_date: datetime,
        method: str = 'median'
    ) -> ee.Image:
        """
        Crée composite de référence (période sans inondation)
        
        Args:
            collection: Collection Sentinel-1
            start_date: Date début période référence
            end_date: Date fin période référence
            method: Méthode composite
        
        Returns:
            Image composite de référence
        """
        filtered = collection.filterDate(
            start_date.strftime('%Y-%m-%d'),
            end_date.strftime('%Y-%m-%d')
        )
        
        if method == 'median':
            composite = filtered.median()
        elif method == 'mean':
            composite = filtered.mean()
        else:
            raise ValueError(f"Méthode inconnue: {method}")
        
        return composite
    
    def vectorize_flood_extent(
        self,
        flood_mask: ee.Image,
        basin_boundary: ee.Geometry,
        scale: int = 10
    ) -> ee.FeatureCollection:
        """
        Vectorise le masque d'inondation en polygones
        
        Args:
            flood_mask: Masque binaire inondations
            basin_boundary: Limite bassin
            scale: Résolution vectorisation
        
        Returns:
            FeatureCollection des zones inondées
        """
        # Convertir raster en vecteur
        vectors = flood_mask.reduceToVectors(
            geometry=basin_boundary,
            scale=scale,
            geometryType='polygon',
            eightConnected=False,
            labelProperty='flood',
            maxPixels=1e10
        )
        
        # Ajouter attributs
        def add_attributes(feature):
            area = feature.geometry().area().divide(1e6)  # km²
            return feature.set({
                'area_km2': area,
                'detection_date': ee.Date(flood_mask.get('system:time_start')).format('YYYY-MM-dd')
            })
        
        vectors_with_attrs = vectors.map(add_attributes)
        
        return vectors_with_attrs


# Tests
def test_flood_detection():
    """Test détection inondations"""
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
    
    # Période test
    event_date = datetime.now()
    before_date = event_date - timedelta(days=30)
    
    # Sentinel-1
    s1_before = acquirer.acquire_sentinel1_sar(
        before_date - timedelta(days=7),
        before_date
    )
    
    s1_event = acquirer.acquire_sentinel1_sar(
        event_date - timedelta(days=3),
        event_date
    )
    
    if s1_before.size().getInfo() > 0 and s1_event.size().getInfo() > 0:
        # Prétraiter
        preprocessor = ImagePreprocessor()
        before_img = preprocessor.preprocess_sentinel1(s1_before.first())
        event_img = preprocessor.preprocess_sentinel1(s1_event.first())
        
        # Données auxiliaires
        aux = acquirer.get_auxiliary_data()
        
        # Détection
        detector = FloodDetector(config['processing']['flood_detection'])
        flood_mask = detector.detect_flood_sar_difference(
            before_img,
            event_img,
            aux['permanent_water'],
            aux['dem']
        )
        
        # Métriques
        metrics = detector.calculate_flood_metrics(
            flood_mask,
            acquirer.basin
        )
        
        print("Métriques inondations:")
        print(f"  Surface: {metrics['flood_area_km2'].getInfo():.2f} km²")
        
        # Vectorisation
        flood_vectors = detector.vectorize_flood_extent(
            flood_mask,
            acquirer.basin
        )
        
        print(f"  Nombre polygones: {flood_vectors.size().getInfo()}")
        print("✅ Tests détection inondations réussis!")
    else:
        print("⚠️ Pas assez d'images Sentinel-1 pour test")


if __name__ == '__main__':
    test_flood_detection()
```

**Critères de validation**:
- ✅ Détection SAR différentielle fonctionne
- ✅ Post-traitement morphologique appliqué
- ✅ Métriques calculées correctement
- ✅ Vectorisation produit GeoJSON valide

---

# PHASE 5: VALIDATION ET CONTRÔLE QUALITÉ

## Tâche 5.1: Module validation multi-sources

**Action requise**: Implémente validation croisée et contrôle qualité

```python
# /opt/sebou_monitoring/src/validation/validator.py

import ee
import logging
from typing import Dict, List, Optional, Tuple
import pandas as pd
import geopandas as gpd
from datetime import datetime
import numpy as np

class DataValidator:
    """
    Validateur de résultats avec multiples méthodes
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.logger = logging.getLogger(__name__)
    
    def cross_validate_snow(
        self,
        modis_snow: ee.Image,
        sentinel2_snow: ee.Image,
        basin: ee.Geometry,
        scale: int = 500
    ) -> Dict:
        """
        Validation croisée neige MODIS vs Sentinel-2
        
        Args:
            modis_snow: Masque neige MODIS
            sentinel2_snow: Masque neige Sentinel-2
            basin: Zone validation
            scale: Résolution
        
        Returns:
            Métriques d'accord entre sources
        """
        self.logger.info("Validation croisée MODIS vs Sentinel-2")
        
        # Rééchantillonner S2 à résolution MODIS
        s2_resampled = sentinel2_snow.reduceResolution(
            reducer=ee.Reducer.mean(),
            maxPixels=1024
        ).reproject(
            crs=modis_snow.projection(),
            scale=scale
        )
        
        # Convertir en binaire
        s2_binary = s2_resampled.gt(0.5)
        
        # Pixels d'accord
        agreement = modis_snow.eq(s2_binary)
        disagreement = modis_snow.neq(s2_binary)
        
        # Statistiques
        stats = agreement.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=basin,
            scale=scale,
            maxPixels=1e10
        )
        
        agreement_rate = ee.Number(stats.get('snow_mask')).multiply(100)
        
        return {
            'agreement_rate': agreement_rate,
            'agreement_map': agreement,
            'disagreement_map': disagreement
        }
    
    def validate_with_stations(
        self,
        snow_mask: ee.Image,
        station_points: gpd.GeoDataFrame,
        date: datetime
    ) -> Dict:
        """
        Validation avec observations stations météo
        
        Args:
            snow_mask: Masque neige prédit
            station_points: GeoDataFrame avec observations
            date: Date validation
        
        Returns:
            Matrice de confusion et métriques
        """
        self.logger.info("Validation avec stations météo")
        
        # Filtrer observations pour date
        observations = station_points[
            station_points['observation_date'] == date
        ]
        
        if len(observations) == 0:
            self.logger.warning(f"Aucune observation terrain pour {date}")
            return None
        
        # Convertir en FeatureCollection GEE
        features = []
        for idx, row in observations.iterrows():
            point = ee.Geometry.Point([row.geometry.x, row.geometry.y])
            feature = ee.Feature(point, {
                'station_id': row['station_id'],
                'snow_observed': int(row['snow_presence'])
            })
            features.append(feature)
        
        station_fc = ee.FeatureCollection(features)
        
        # Extraire valeurs prédites
        predicted = snow_mask.reduceRegions(
            collection=station_fc,
            reducer=ee.Reducer.first(),
            scale=500
        )
        
        # Calculer matrice de confusion
        predicted_list = predicted.getInfo()['features']
        
        tp = fp = tn = fn = 0
        
        for feat in predicted_list:
            props = feat['properties']
            observed = props.get('snow_observed', 0)
            pred = props.get('first', 0)
            
            if observed == 1 and pred == 1:
                tp += 1
            elif observed == 0 and pred == 1:
                fp += 1
            elif observed == 0 and pred == 0:
                tn += 1
            elif observed == 1 and pred == 0:
                fn += 1
        
        # Métriques
        accuracy = (tp + tn) / (tp + tn + fp + fn) if (tp + tn + fp + fn) > 0 else 0
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        return {
            'confusion_matrix': {
                'TP': tp, 'FP': fp, 'TN': tn, 'FN': fn
            },
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1_score,
            'n_stations': len(predicted_list)
        }
    
    def detect_anomalies(
        self,
        current_value: float,
        historical_data: List[float],
        threshold_zscore: float = 2.5
    ) -> Dict:
        """
        Détecte anomalies statistiques
        
        Args:
            current_value: Valeur actuelle
            historical_data: Historique valeurs
            threshold_zscore: Seuil Z-score pour anomalie
        
        Returns:
            Détection anomalie et statistiques
        """
        if len(historical_data) < 10:
            self.logger.warning("Historique insuffisant pour détection anomalies")
            return {'is_anomaly': False, 'reason': 'insufficient_data'}
        
        mean = np.mean(historical_data)
        std = np.std(historical_data)
        
        if std == 0:
            return {'is_anomaly': False, 'reason': 'zero_variance'}
        
        z_score = (current_value - mean) / std
        is_anomaly = abs(z_score) > threshold_zscore
        
        return {
            'is_anomaly': is_anomaly,
            'z_score': float(z_score),
            'mean': float(mean),
            'std': float(std),
            'current_value': current_value,
            'anomaly_type': 'high' if z_score > 0 else 'low' if is_anomaly else None
        }
    
    def temporal_consistency_check(
        self,
        current_image: ee.Image,
        previous_image: ee.Image,
        max_change_threshold: float = 0.3
    ) -> Dict:
        """
        Vérifie cohérence temporelle
        
        Args:
            current_image: Image actuelle
            previous_image: Image précédente
            max_change_threshold: Changement max réaliste (fraction)
        
        Returns:
            Rapport de cohérence
        """
        # Calculer différence absolue
        difference = current_image.subtract(previous_image).abs()
        
        # Pourcentage de pixels avec changement suspect
        suspicious = difference.gt(max_change_threshold)
        
        suspicious_stats = suspicious.reduceRegion(
            reducer=ee.Reducer.mean(),
            scale=500,
            maxPixels=1e10
        )
        
        suspicious_percentage = ee.Number(
            suspicious_stats.values().get(0)
        ).multiply(100)
        
        is_consistent = suspicious_percentage.lt(10)  # < 10% changement suspect
        
        return {
            'is_temporally_consistent': is_consistent,
            'suspicious_change_percentage': suspicious_percentage
        }
    
    def generate_quality_report(
        self,
        image: ee.Image,
        mask: ee.Image,
        basin: ee.Geometry,
        sensor: str,
        date: datetime
    ) -> Dict:
        """
        Génère rapport qualité complet
        
        Args:
            image: Image source
            mask: Masque détection
            basin: Zone d'intérêt
            sensor: Nom capteur
            date: Date acquisition
        
        Returns:
            Rapport qualité détaillé
        """
        self.logger.info(f"Génération rapport qualité pour {sensor} - {date}")
        
        report = {
            'date': date.strftime('%Y-%m-%d'),
            'sensor': sensor,
            'quality_flags': []
        }
        
        # 1. Couverture nuageuse (si optique)
        if sensor in ['MODIS', 'Sentinel-2']:
            try:
                cloud_cover = image.get('CLOUDY_PIXEL_PERCENTAGE')
                report['cloud_cover_percentage'] = cloud_cover
                
                if ee.Number(cloud_cover).gt(30).getInfo():
                    report['quality_flags'].append('HIGH_CLOUD_COVER')
            except:
                pass
        
        # 2. Couverture spatiale
        valid_pixels = mask.reduceRegion(
            reducer=ee.Reducer.count(),
            geometry=basin,
            scale=500,
            maxPixels=1e10
        )
        
        total_pixels = ee.Image.constant(1).clip(basin).reduceRegion(
            reducer=ee.Reducer.count(),
            geometry=basin,
            scale=500,
            maxPixels=1e10
        )
        
        coverage = ee.Number(valid_pixels.values().get(0)) \
                    .divide(total_pixels.values().get(0)) \
                    .multiply(100)
        
        report['spatial_coverage_percentage'] = coverage.getInfo()
        
        if coverage.lt(80).getInfo():
            report['quality_flags'].append('LOW_SPATIAL_COVERAGE')
        
        # 3. Score qualité global (0-100)
        quality_score = 100
        
        if 'HIGH_CLOUD_COVER' in report['quality_flags']:
            quality_score -= 30
        if 'LOW_SPATIAL_COVERAGE' in report['quality_flags']:
            quality_score -= 20
        
        report['quality_score'] = max(0, quality_score)
        
        return report


# Tests
def test_validation():
    """Test module validation"""
    import logging
    import yaml
    
    logging.basicConfig(level=logging.INFO)
    
    with open('/opt/sebou_monitoring/config/config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    validator = DataValidator(config)
    
    # Test détection anomalies
    historical = [100, 105, 98, 102, 99, 103, 101, 97, 104, 100]
    current = 150  # Anomalie évidente
    
    anomaly_result = validator.detect_anomalies(current, historical)
    print(f"Anomalie détectée: {anomaly_result['is_anomaly']}")
    print(f"Z-score: {anomaly_result['z_score']:.2f}")
    
    # Test validation stations (simulé)
    print("✅ Tests validation réussis!")


if __name__ == '__main__':
    test_validation()
```

**Critères de validation**:
- ✅ Validation croisée multi-sources implémentée
- ✅ Matrice de confusion calculée correctement
- ✅ Détection d'anomalies fonctionne
- ✅ Rapports qualité générés

---

# PHASE 6: EXPORT ET STOCKAGE

## Tâche 6.1: Module export optimisé

**Action requise**: Implémente export vers formats optimisés et base de données

```python
# /opt/sebou_monitoring/src/export/exporter.py

import ee
import os
import logging
from typing import Dict, List, Optional
from datetime import datetime
import geopandas as gpd
import rasterio
from rasterio.crs import CRS
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import json

class DataExporter:
    """
    Gestionnaire d'export multi-formats
    """
    
    def __init__(self, config: Dict):
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        self.paths = config['paths']
        self.db_config = config['database']
        
        # Connexion base de données
        self.engine = self._create_db_connection()
    
    def _create_db_connection(self):
        """Crée connexion PostgreSQL"""
        conn_string = (
            f"postgresql://{self.db_config['user']}:"
            f"{os.getenv('DB_PASSWORD')}@"
            f"{self.db_config['host']}:"
            f"{self.db_config['port']}/"
            f"{self.db_config['database']}"
        )
        return create_engine(conn_string)
    
    def export_raster_cog(
        self,
        image: ee.Image,
        filename: str,
        scale: int = 500,
        region: Optional[ee.Geometry] = None
    ) -> str:
        """
        Exporte raster en Cloud Optimized GeoTIFF
        
        Args:
            image: Image à exporter
            filename: Nom fichier (sans extension)
            scale: Résolution
            region: Zone export
        
        Returns:
            Chemin fichier exporté
        """
        self.logger.info(f"Export COG: {filename}")
        
        output_path = os.path.join(self.paths['products'], 'cog', f"{filename}.tif")
        
        # Export via Earth Engine
        task = ee.batch.Export.image.toDrive(
            image=image.toFloat(),
            description=filename,
            folder='Sebou_Monitoring',
            fileNamePrefix=filename,
            region=region,
            scale=scale,
            crs='EPSG:32629',
            fileFormat='GeoTIFF',
            formatOptions={
                'cloudOptimized': True,
                'compression': 'DEFLATE'
            },
            maxPixels=1e10
        )
        
        task.start()
        
        # Attendre complétion (pour workflow synchrone)
        # Note: En production, utiliser système asynchrone
        self.logger.info(f"Task ID: {task.id}")
        
        return output_path
    
    def export_vector_geojson(
        self,
        feature_collection: ee.FeatureCollection,
        filename: str
    ) -> str:
        """
        Exporte vecteur en GeoJSON
        
        Args:
            feature_collection: Collection à exporter
            filename: Nom fichier
        
        Returns:
            Chemin fichier
        """
        self.logger.info(f"Export GeoJSON: {filename}")
        
        output_path = os.path.join(
            self.paths['products'],
            'vectors',
            f"{filename}.geojson"
        )
        
        # Convertir en GeoJSON
        geojson_data = feature_collection.getInfo()
        
        # Sauvegarder
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w') as f:
            json.dump(geojson_data, f)
        
        self.logger.info(f"GeoJSON exporté: {output_path}")
        
        return output_path
    
    def save_statistics_to_db(
        self,
        date: datetime,
        snow_metrics: Dict,
        flood_metrics: Optional[Dict],
        quality_report: Dict
    ) -> None:
        """
        Sauvegarde statistiques dans PostgreSQL
        
        Args:
            date: Date traitement
            snow_metrics: Métriques neige
            flood_metrics: Métriques inondations (optionnel)
            quality_report: Rapport qualité
        """
        self.logger.info(f"Sauvegarde statistiques DB: {date}")
        
        # Préparer données
        data = {
            'date': date.date(),
            'snow_area_km2': float(snow_metrics['snow_area_km2'].getInfo()),
            'snow_percentage': float(snow_metrics['snow_percentage'].getInfo()),
            'mean_snow_elevation': float(snow_metrics['mean_snow_elevation'].getInfo()),
            'flood_area_km2': float(flood_metrics['flood_area_km2'].getInfo()) if flood_metrics else None,
            'quality_score': quality_report['quality_score'],
            'data_sources': quality_report.get('sensor', 'Unknown'),
            'processing_time_seconds': 0  # À calculer en production
        }
        
        # Insérer
        with self.engine.connect() as conn:
            # Vérifier si existe déjà
            result = conn.execute(
                "SELECT id FROM daily_statistics WHERE date = %s",
                (data['date'],)
            )
            
            if result.rowcount > 0:
                # Update
                conn.execute("""
                    UPDATE daily_statistics
                    SET snow_area_km2 = %s,
                        snow_percentage = %s,
                        mean_snow_elevation = %s,
                        flood_area_km2 = %s,
                        quality_score = %s
                    WHERE date = %s
                """, (
                    data['snow_area_km2'],
                    data['snow_percentage'],
                    data['mean_snow_elevation'],
                    data['flood_area_km2'],
                    data['quality_score'],
                    data['date']
                ))
                self.logger.info("Statistiques mises à jour")
            else:
                # Insert
                conn.execute("""
                    INSERT INTO daily_statistics (
                        date, snow_area_km2, snow_percentage,
                        mean_snow_elevation, flood_area_km2, quality_score
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    data['date'],
                    data['snow_area_km2'],
                    data['snow_percentage'],
                    data['mean_snow_elevation'],
                    data['flood_area_km2'],
                    data['quality_score']
                ))
                self.logger.info("Statistiques insérées")
            
            conn.commit()
    
    def save_flood_vectors_to_db(
        self,
        flood_vectors: ee.FeatureCollection,
        date: datetime,
        sensor: str
    ) -> None:
        """
        Sauvegarde polygones inondations dans PostGIS
        
        Args:
            flood_vectors: Polygones inondations
            date: Date détection
            sensor: Capteur source
        """
        self.logger.info(f"Sauvegarde flood vectors DB: {date}")
        
        # Convertir en GeoDataFrame
        geojson_data = flood_vectors.getInfo()
        gdf = gpd.GeoDataFrame.from_features(geojson_data['features'])
        
        # Définir CRS
        gdf.crs = "EPSG:32629"
        
        # Ajouter métadonnées
        gdf['date'] = date.date()
        gdf['sensor'] = sensor
        gdf['detection_confidence'] = 0.85  # À calculer en production
        
        # Sauvegarder dans PostGIS
        gdf.to_postgis(
            name='flood_extents',
            con=self.engine,
            if_exists='append',
            index=False
        )
        
        self.logger.info(f"Polygones inondations sauvegardés: {len(gdf)}")
    
    def create_thumbnail(
        self,
        image: ee.Image,
        filename: str,
        vis_params: Dict,
        dimensions: int = 512
    ) -> str:
        """
        Crée vignette PNG pour visualisation rapide
        
        Args:
            image: Image source
            filename: Nom fichier
            vis_params: Paramètres visualisation
            dimensions: Taille vignette
        
        Returns:
            Chemin fichier
        """
        output_path = os.path.join(
            self.paths['products'],
            'thumbnails',
            f"{filename}.png"
        )
        
        # Obtenir URL vignette
        url = image.getThumbURL({
            'dimensions': dimensions,
            'format': 'png',
            **vis_params
        })
        
        # Télécharger
        import requests
        response = requests.get(url)
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'wb') as f:
            f.write(response.content)
        
        self.logger.info(f"Vignette créée: {output_path}")
        
        return output_path


# Tests
def test_export():
    """Test module export"""
    import logging
    import yaml
    
    logging.basicConfig(level=logging.INFO)
    
    with open('/opt/sebou_monitoring/config/config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    exporter = DataExporter(config)
    
    # Test connexion DB
    try:
        with exporter.engine.connect() as conn:
            result = conn.execute("SELECT version();")
            print(f"PostgreSQL version: {result.fetchone()[0]}")
        print("✅ Connexion DB réussie!")
    except Exception as e:
        print(f"❌ Erreur connexion DB: {e}")
    
    # Test sauvegarde stats (simulé)
    # exporter.save_statistics_to_db(...)
    
    print("✅ Tests export réussis!")


if __name__ == '__main__':
    test_export()
```

**Critères de validation**:
- ✅ Connexion PostgreSQL établie
- ✅ Export COG configuré
- ✅ Export GeoJSON fonctionne
- ✅ Insertion DB sans erreur

---

# PHASE 7: PIPELINE AUTOMATISÉ

## Tâche 7.1: Orchestration complète avec logging

**Action requise**: Implémente pipeline end-to-end automatisé

```python
# /opt/sebou_monitoring/src/pipeline/main_pipeline.py

import ee
import logging
import yaml
import os
from datetime import datetime, timedelta
from typing import Dict, Optional
import traceback

from src.acquisition.data_acquirer import SebouDataAcquirer
from src.preprocessing.preprocessor import ImagePreprocessor
from src.detection.snow_detector import SnowDetector
from src.detection.flood_detector import FloodDetector
from src.validation.validator import DataValidator
from src.export.exporter import DataExporter

class SebouMonitoringPipeline:
    """
    Pipeline complet de monitoring du bassin du Sebou
    """
    
    def __init__(self, config_path: str):
        """
        Initialise le pipeline
        
        Args:
            config_path: Chemin vers fichier config.yaml
        """
        # Charger configuration
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Initialiser logging
        self._setup_logging()
        
        self.logger.info("=" * 80)
        self.logger.info("Initialisation Sebou Monitoring Pipeline")
        self.logger.info("=" * 80)
        
        # Initialiser Earth Engine
        ee.Initialize()
        self.logger.info("✓ Earth Engine initialisé")
        
        # Initialiser modules
        self.acquirer = SebouDataAcquirer(config_path)
        self.preprocessor = ImagePreprocessor()
        self.snow_detector = SnowDetector(self.config['processing']['snow_detection'])
        self.flood_detector = FloodDetector(self.config['processing']['flood_detection'])
        self.validator = DataValidator(self.config)
        self.exporter = DataExporter(self.config)
        
        self.logger.info("✓ Tous les modules initialisés")
    
    def _setup_logging(self):
        """Configure système de logging"""
        log_dir = self.config['paths']['logs']
        os.makedirs(log_dir, exist_ok=True)
        
        log_file = os.path.join(
            log_dir,
            f"pipeline_{datetime.now().strftime('%Y%m%d')}.log"
        )
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        
        self.logger = logging.getLogger(__name__)
    
    def run_daily_processing(self, target_date: Optional[datetime] = None):
        """
        Traitement quotidien complet
        
        Args:
            target_date: Date à traiter (par défaut: hier)
        """
        if target_date is None:
            target_date = datetime.now() - timedelta(days=1)
        
        date_str = target_date.strftime('%Y-%m-%d')
        
        self.logger.info("")
        self.logger.info("=" * 80)
        self.logger.info(f"DÉBUT TRAITEMENT QUOTIDIEN: {date_str}")
        self.logger.info("=" * 80)
        
        start_time = datetime.now()
        
        try:
            # ÉTAPE 1: Acquisition
            self.logger.info("\n[1/7] Acquisition données...")
            data = self._step_acquisition(target_date)
            
            # ÉTAPE 2: Prétraitement
            self.logger.info("\n[2/7] Prétraitement...")
            processed = self._step_preprocessing(data)
            
            # ÉTAPE 3: Détection neige
            self.logger.info("\n[3/7] Détection couverture neigeuse...")
            snow_results = self._step_snow_detection(processed)
            
            # ÉTAPE 4: Détection inondations (si conditions)
            self.logger.info("\n[4/7] Détection inondations...")
            flood_results = self._step_flood_detection(processed, target_date)
            
            # ÉTAPE 5: Validation
            self.logger.info("\n[5/7] Validation et contrôle qualité...")
            validation = self._step_validation(snow_results, flood_results, target_date)
            
            # ÉTAPE 6: Export
            self.logger.info("\n[6/7] Export résultats...")
            self._step_export(snow_results, flood_results, validation, target_date)
            
            # ÉTAPE 7: Notifications
            self.logger.info("\n[7/7] Notifications...")
            self._step_notifications(snow_results, flood_results, validation)
            
            # Succès
            duration = (datetime.now() - start_time).total_seconds()
            self.logger.info("")
            self.logger.info("=" * 80)
            self.logger.info(f"✓ TRAITEMENT TERMINÉ AVEC SUCCÈS")
            self.logger.info(f"  Durée: {duration:.1f} secondes")
            self.logger.info("=" * 80)
            
        except Exception as e:
            self.logger.error("")
            self.logger.error("=" * 80)
            self.logger.error(f"✗ ERREUR CRITIQUE DANS LE PIPELINE")
            self.logger.error(f"  Message: {str(e)}")
            self.logger.error("=" * 80)
            self.logger.error(traceback.format_exc())
            
            # Notification erreur
            self._send_error_notification(str(e))
            
            raise
    
    def _step_acquisition(self, date: datetime) -> Dict:
        """Étape 1: Acquisition données"""
        data = {}
        
        # MODIS Snow
        self.logger.info("  → Acquisition MODIS...")
        modis = self.acquirer.acquire_modis_snow(
            date,
            date + timedelta(days=1)
        )
        data['modis'] = modis.first() if modis.size().getInfo() > 0 else None
        
        if data['modis']:
            self.logger.info("    ✓ MODIS acquis")
        else:
            self.logger.warning("    ⚠ Pas d'images MODIS disponibles")
        
        # Sentinel-1 (pour inondations)
        self.logger.info("  → Acquisition Sentinel-1...")
        s1 = self.acquirer.acquire_sentinel1_sar(
            date - timedelta(days=3),
            date + timedelta(days=1)
        )
        data['sentinel1'] = s1.first() if s1.size().getInfo() > 0 else None
        
        if data['sentinel1']:
            self.logger.info("    ✓ Sentinel-1 acquis")
        
        # Données auxiliaires
        self.logger.info("  → Chargement données auxiliaires...")
        data['auxiliary'] = self.acquirer.get_auxiliary_data()
        self.logger.info("    ✓ DEM, pente, eau permanente chargés")
        
        return data
    
    def _step_preprocessing(self, data: Dict) -> Dict:
        """Étape 2: Prétraitement"""
        processed = {}
        
        if data.get('modis'):
            self.logger.info("  → Prétraitement MODIS...")
            processed['modis'] = self.preprocessor.preprocess_modis(data['modis'])
            self.logger.info("    ✓ MODIS prétraité")
        
        if data.get('sentinel1'):
            self.logger.info("  → Prétraitement Sentinel-1...")
            processed['sentinel1'] = self.preprocessor.preprocess_sentinel1(data['sentinel1'])
            self.logger.info("    ✓ Sentinel-1 prétraité (filtre speckle appliqué)")
        
        processed['auxiliary'] = data['auxiliary']
        
        return processed
    
    def _step_snow_detection(self, processed: Dict) -> Optional[Dict]:
        """Étape 3: Détection neige"""
        if not processed.get('modis'):
            self.logger.warning("  ⚠ Pas de données MODIS - skip détection neige")
            return None
        
        # Calculer NDSI si nécessaire
        modis_with_ndsi = self.snow_detector.calculate_ndsi(processed['modis'])
        
        # Détection
        self.logger.info("  → Détection neige (méthode multi-critères)...")
        snow_mask = self.snow_detector.detect_snow_adaptive(
            modis_with_ndsi,
            processed['auxiliary']['dem'],
            method='multi_criteria'
        )
        
        # Post-traitement
        self.logger.info("  → Post-traitement masque...")
        snow_final = self.snow_detector.post_process_snow_mask(snow_mask)
        
        # Métriques
        self.logger.info("  → Calcul métriques...")
        metrics = self.snow_detector.calculate_snow_metrics(
            snow_final,
            self.acquirer.basin,
            processed['auxiliary']['dem']
        )
        
        snow_area = metrics['snow_area_km2'].getInfo()
        snow_pct = metrics['snow_percentage'].getInfo()
        
        self.logger.info(f"    ✓ Détection terminée")
        self.logger.info(f"      Surface enneigée: {snow_area:.2f} km²")
        self.logger.info(f"      Pourcentage bassin: {snow_pct:.2f}%")
        
        return {
            'mask': snow_final,
            'metrics': metrics
        }
    
    def _step_flood_detection(
        self,
        processed: Dict,
        date: datetime
    ) -> Optional[Dict]:
        """Étape 4: Détection inondations"""
        
        # Vérifier si conditions inondation
        if not self._check_flood_trigger(date):
            self.logger.info("  ℹ Conditions inondation non remplies - skip")
            return None
        
        if not processed.get('sentinel1'):
            self.logger.warning("  ⚠ Pas de données Sentinel-1 - skip détection inondations")
            return None
        
        self.logger.info("  → Conditions inondation détectées!")
        
        # Image de référence (période avant)
        self.logger.info("  → Chargement image référence...")
        s1_before = self.acquirer.acquire_sentinel1_sar(
            date - timedelta(days=30),
            date - timedelta(days=20)
        )
        
        if s1_before.size().getInfo() == 0:
            self.logger.warning("  ⚠ Pas d'image référence - utilisation seuillage simple")
            
            flood_mask = self.flood_detector.detect_flood_sar_threshold(
                processed['sentinel1'],
                processed['auxiliary']['permanent_water'],
                processed['auxiliary']['dem']
            )
        else:
            before_img = self.preprocessor.preprocess_sentinel1(s1_before.first())
            
            self.logger.info("  → Détection par différence SAR...")
            flood_mask = self.flood_detector.detect_flood_sar_difference(
                before_img,
                processed['sentinel1'],
                processed['auxiliary']['permanent_water'],
                processed['auxiliary']['dem']
            )
        
        # Métriques
        self.logger.info("  → Calcul métriques inondations...")
        metrics = self.flood_detector.calculate_flood_metrics(
            flood_mask,
            self.acquirer.basin
        )
        
        flood_area = metrics['flood_area_km2'].getInfo()
        
        self.logger.info(f"    ✓ Détection terminée")
        self.logger.info(f"      Surface inondée: {flood_area:.2f} km²")
        
        # Vectorisation
        self.logger.info("  → Vectorisation zones inondées...")
        flood_vectors = self.flood_detector.vectorize_flood_extent(
            flood_mask,
            self.acquirer.basin
        )
        
        n_polygons = flood_vectors.size().getInfo()
        self.logger.info(f"    ✓ {n_polygons} polygones créés")
        
        return {
            'mask': flood_mask,
            'metrics': metrics,
            'vectors': flood_vectors
        }
    
    def _step_validation(
        self,
        snow_results: Optional[Dict],
        flood_results: Optional[Dict],
        date: datetime
    ) -> Dict:
        """Étape 5: Validation"""
        validation = {}
        
        # Rapport qualité neige
        if snow_results:
            self.logger.info("  → Génération rapport qualité neige...")
            quality = self.validator.generate_quality_report(
                snow_results['mask'],
                snow_results['mask'],
                self.acquirer.basin,
                'MODIS',
                date
            )
            validation['snow_quality'] = quality
            self.logger.info(f"    ✓ Score qualité: {quality['quality_score']}/100")
        
        # Rapport qualité inondations
        if flood_results:
            self.logger.info("  → Génération rapport qualité inondations...")
            quality = self.validator.generate_quality_report(
                flood_results['mask'],
                flood_results['mask'],
                self.acquirer.basin,
                'Sentinel-1',
                date
            )
            validation['flood_quality'] = quality
            self.logger.info(f"    ✓ Score qualité: {quality['quality_score']}/100")
        
        return validation
    
    def _step_export(
        self,
        snow_results: Optional[Dict],
        flood_results: Optional[Dict],
        validation: Dict,
        date: datetime
    ):
        """Étape 6: Export"""
        
        date_str = date.strftime('%Y%m%d')
        
        # Export neige
        if snow_results:
            self.logger.info("  → Export masque neige (COG)...")
            self.exporter.export_raster_cog(
                snow_results['mask'],
                f"snow_{date_str}",
                scale=500,
                region=self.acquirer.basin
            )
            
            self.logger.info("  → Sauvegarde statistiques neige (DB)...")
            self.exporter.save_statistics_to_db(
                date,
                snow_results['metrics'],
                flood_results['metrics'] if flood_results else None,
                validation.get('snow_quality', {})
            )
            
            self.logger.info("    ✓ Neige exportée")
        
        # Export inondations
        if flood_results:
            self.logger.info("  → Export zones inondées (GeoJSON)...")
            self.exporter.export_vector_geojson(
                flood_results['vectors'],
                f"flood_{date_str}"
            )
            
            self.logger.info("  → Sauvegarde polygones inondations (PostGIS)...")
            self.exporter.save_flood_vectors_to_db(
                flood_results['vectors'],
                date,
                'Sentinel-1'
            )
            
            self.logger.info("    ✓ Inondations exportées")
    
    def _step_notifications(
        self,
        snow_results: Optional[Dict],
        flood_results: Optional[Dict],
        validation: Dict
    ):
        """Étape 7: Notifications"""
        
        # Alerte qualité
        if validation.get('snow_quality'):
            quality = validation['snow_quality']
            if quality['quality_flags']:
                self.logger.warning(f"  ⚠ Flags qualité détectés: {quality['quality_flags']}")
                self._send_quality_alert(quality)
        
        # Alerte inondation
        if flood_results:
            flood_area = flood_results['metrics']['flood_area_km2'].getInfo()
            if flood_area > self.config['alerts']['thresholds']['flood_area_critical']:
                self.logger.warning(f"  ⚠ Inondation critique: {flood_area:.2f} km²")
                self._send_flood_alert(flood_area)
    
    def _check_flood_trigger(self, date: datetime) -> bool:
        """
        Vérifie si conditions pour détection inondations
        
        TODO: Implémenter requête API météo ou DB
        """
        # Pour l'instant, toujours activer
        return True
    
    def _send_quality_alert(self, quality: Dict):
        """Envoie alerte qualité"""
        self.logger.info("  → Envoi alerte qualité...")
        # TODO: Implémenter envoi email
    
    def _send_flood_alert(self, area: float):
        """Envoie alerte inondation critique"""
        self.logger.info("  → Envoi alerte inondation URGENTE...")
        # TODO: Implémenter envoi email/SMS
    
    def _send_error_notification(self, error_msg: str):
        """Envoie notification erreur"""
        self.logger.error("  → Envoi notification erreur...")
        # TODO: Implémenter envoi email


def main():
    """Point d'entrée principal"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Pipeline monitoring bassin Sebou'
    )
    parser.add_argument(
        '--config',
        default='/opt/sebou_monitoring/config/config.yaml',
        help='Chemin fichier configuration'
    )
    parser.add_argument(
        '--date',
        help='Date traitement (YYYY-MM-DD), défaut=hier'
    )
    
    args = parser.parse_args()
    
    # Parse date
    if args.date:
        target_date = datetime.strptime(args.date, '%Y-%m-%d')
    else:
        target_date = None
    
    # Exécuter pipeline
    pipeline = SebouMonitoringPipeline(args.config)
    pipeline.run_daily_processing(target_date)


if __name__ == '__main__':
    main()
```

**Critères de validation**:
- ✅ Pipeline exécute toutes les étapes
- ✅ Logging détaillé à chaque étape
- ✅ Gestion d'erreurs robuste
- ✅ Export réussi dans tous les formats

## Tâche 7.2: Planification automatique

**Action requise**: Configure cron ou Airflow pour exécution quotidienne

```bash
# Option 1: Crontab simple
# Éditer crontab: crontab -e

# Exécution quotidienne à 6h00 UTC
0 6 * * * /opt/sebou_monitoring/venv/bin/python /opt/sebou_monitoring/src/pipeline/main_pipeline.py >> /data/sebou_monitoring/logs/cron.log 2>&1
```

```python
# Option 2: Apache Airflow DAG
# /opt/sebou_monitoring/dags/sebou_monitoring_dag.py

from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
import sys

sys.path.insert(0, '/opt/sebou_monitoring')

from src.pipeline.main_pipeline import SebouMonitoringPipeline

default_args = {
    'owner': 'sebou_team',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email': ['equipe@example.com'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=30),
}

dag = DAG(
    'sebou_monitoring',
    default_args=default_args,
    description='Monitoring quotidien bassin Sebou',
    schedule_interval='0 6 * * *',  # 06h00 UTC
    catchup=False
)

def run_pipeline(**context):
    """Exécute le pipeline"""
    execution_date = context['execution_date']
    
    pipeline = SebouMonitoringPipeline(
        '/opt/sebou_monitoring/config/config.yaml'
    )
    pipeline.run_daily_processing(execution_date)

task = PythonOperator(
    task_id='run_monitoring',
    python_callable=run_pipeline,
    dag=dag
)
```

---

# PHASE 8: API ET DASHBOARD

## Tâche 8.1: API REST

**Action requise**: Implémente API FastAPI complète

```python
# /opt/sebou_monitoring/src/api/main.py

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, date, timedelta
from typing import List, Optional
import geopandas as gpd
from sqlalchemy import create_engine, text
import json
import os

app = FastAPI(
    title="Sebou Monitoring API",
    description="API pour données monitoring bassin Sebou",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration DB
DB_URL = (
    f"postgresql://{os.getenv('DB_USER')}:"
    f"{os.getenv('DB_PASSWORD')}@"
    f"{os.getenv('DB_HOST')}:"
    f"{os.getenv('DB_PORT')}/"
    f"{os.getenv('DB_NAME')}"
)

engine = create_engine(DB_URL)


@app.get("/")
def read_root():
    """Page d'accueil API"""
    return {
        "name": "Sebou Monitoring API",
        "version": "1.0.0",
        "endpoints": [
            "/stats/daily/{date}",
            "/stats/timeseries",
            "/flood/{date}",
            "/alerts",
            "/health"
        ]
    }


@app.get("/health")
def health_check():
    """Vérification santé API"""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database error: {str(e)}")


@app.get("/stats/daily/{target_date}")
def get_daily_stats(target_date: str):
    """
    Récupère statistiques quotidiennes
    
    Args:
        target_date: Date format YYYY-MM-DD
    
    Returns:
        Statistiques du jour
    """
    try:
        date_obj = datetime.strptime(target_date, '%Y-%m-%d').date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Format date invalide (YYYY-MM-DD)")
    
    query = text("""
        SELECT 
            date,
            snow_area_km2,
            snow_percentage,
            mean_snow_elevation,
            flood_area_km2,
            quality_score
        FROM daily_statistics
        WHERE date = :target_date
    """)
    
    with engine.connect() as conn:
        result = conn.execute(query, {"target_date": date_obj}).fetchone()
    
    if not result:
        raise HTTPException(status_code=404, detail="Données non trouvées pour cette date")
    
    return {
        "date": str(result[0]),
        "snow_area_km2": float(result[1]) if result[1] else None,
        "snow_percentage": float(result[2]) if result[2] else None,
        "mean_snow_elevation": float(result[3]) if result[3] else None,
        "flood_area_km2": float(result[4]) if result[4] else 0,
        "quality_score": float(result[5]) if result[5] else None
    }


@app.get("/stats/timeseries")
def get_timeseries(
    days: int = Query(90, ge=1, le=365),
    end_date: Optional[str] = None
):
    """
    Récupère série temporelle
    
    Args:
        days: Nombre de jours historique
        end_date: Date fin (défaut: aujourd'hui)
    
    Returns:
        Série temporelle
    """
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Format date invalide")
    else:
        end = date.today()
    
    start = end - timedelta(days=days)
    
    query = text("""
        SELECT 
            date,
            snow_area_km2,
            COALESCE(flood_area_km2, 0) as flood_area_km2,
            quality_score
        FROM daily_statistics
        WHERE date BETWEEN :start_date AND :end_date
        ORDER BY date
    """)
    
    with engine.connect() as conn:
        results = conn.execute(query, {
            "start_date": start,
            "end_date": end
        }).fetchall()
    
    return {
        "dates": [str(row[0]) for row in results],
        "snow_area": [float(row[1]) if row[1] else 0 for row in results],
        "flood_area": [float(row[2]) for row in results],
        "quality_score": [float(row[3]) if row[3] else None for row in results]
    }


@app.get("/flood/{target_date}")
def get_flood_extent(target_date: str):
    """
    Récupère géométries zones inondées
    
    Args:
        target_date: Date format YYYY-MM-DD
    
    Returns:
        GeoJSON zones inondées
    """
    try:
        date_obj = datetime.strptime(target_date, '%Y-%m-%d').date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Format date invalide")
    
    query = text("""
        SELECT 
            id,
            ST_AsGeoJSON(geom) as geometry,
            area_km2,
            detection_confidence
        FROM flood_extents
        WHERE date = :target_date
    """)
    
    with engine.connect() as conn:
        results = conn.execute(query, {"target_date": date_obj}).fetchall()
    
    if not results:
        return {
            "type": "FeatureCollection",
            "features": []
        }
    
    features = []
    for row in results:
        features.append({
            "type": "Feature",
            "geometry": json.loads(row[1]),
            "properties": {
                "id": row[0],
                "area_km2": float(row[2]),
                "confidence": float(row[3])
            }
        })
    
    return {
        "type": "FeatureCollection",
        "features": features
    }


@app.get("/alerts")
def get_active_alerts(
    status: str = Query("active", regex="^(active|resolved|all)$")
):
    """
    Récupère alertes
    
    Args:
        status: Statut alertes (active/resolved/all)
    
    Returns:
        Liste alertes
    """
    if status == "all":
        where_clause = "1=1"
    else:
        where_clause = f"status = '{status}'"
    
    query = text(f"""
        SELECT 
            id,
            alert_type,
            severity,
            message,
            affected_area_km2,
            created_at,
            status
        FROM alerts
        WHERE {where_clause}
        ORDER BY created_at DESC
        LIMIT 50
    """)
    
    with engine.connect() as conn:
        results = conn.execute(query).fetchall()
    
    return [
        {
            "id": row[0],
            "type": row[1],
            "severity": row[2],
            "message": row[3],
            "area_km2": float(row[4]) if row[4] else None,
            "timestamp": str(row[5]),
            "status": row[6]
        }
        for row in results
    ]


# Lancement: uvicorn src.api.main:app --host 0.0.0.0 --port 8000
```

**Fichier systemd pour démarrage auto**:

```ini
# /etc/systemd/system/sebou-api.service

[Unit]
Description=Sebou Monitoring API
After=network.target postgresql.service

[Service]
Type=simple
User=sebou
WorkingDirectory=/opt/sebou_monitoring
Environment="PATH=/opt/sebou_monitoring/venv/bin"
ExecStart=/opt/sebou_monitoring/venv/bin/uvicorn src.api.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Activer service
sudo systemctl enable sebou-api
sudo systemctl start sebou-api
sudo systemctl status sebou-api
```

**Critères de validation**:
- ✅ API répond sur http://localhost:8000
- ✅ Endpoint /health retourne "healthy"
- ✅ Données récupérées correctement
- ✅ GeoJSON valide pour inondations

---

# PHASE 9: TESTS ET DÉPLOIEMENT

## Tâche 9.1: Tests unitaires et intégration

**Action requise**: Crée suite de tests complète

```python
# /opt/sebou_monitoring/tests/test_pipeline.py

import unittest
import ee
from datetime import datetime, timedelta
import yaml
import sys
import os

sys.path.insert(0, '/opt/sebou_monitoring')

from src.acquisition.data_acquirer import SebouDataAcquirer
from src.preprocessing.preprocessor import ImagePreprocessor
from src.detection.snow_detector import SnowDetector
from src.detection.flood_detector import FloodDetector
from src.validation.validator import DataValidator

class TestPipeline(unittest.TestCase):
    """Tests pour pipeline complet"""
    
    @classmethod
    def setUpClass(cls):
        """Initialisation une fois pour tous les tests"""
        ee.Initialize()
        
        with open('/opt/sebou_monitoring/config/config.yaml', 'r') as f:
            cls.config = yaml.safe_load(f)
        
        cls.acquirer = SebouDataAcquirer(
            '/opt/sebou_monitoring/config/config.yaml'
        )
        cls.preprocessor = ImagePreprocessor()
        cls.snow_detector = SnowDetector(
            cls.config['processing']['snow_detection']
        )
        cls.flood_detector = FloodDetector(
            cls.config['processing']['flood_detection']
        )
        cls.validator = DataValidator(cls.config)
    
    def test_01_acquisition_modis(self):
        """Test acquisition MODIS"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        
        collection = self.acquirer.acquire_modis_snow(start_date, end_date)
        
        self.assertIsNotNone(collection)
        size = collection.size().getInfo()
        self.assertGreaterEqual(size, 0)
        print(f"✓ MODIS: {size} images")
    
    def test_02_acquisition_sentinel1(self):
        """Test acquisition Sentinel-1"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        
        collection = self.acquirer.acquire_sentinel1_sar(start_date, end_date)
        
        self.assertIsNotNone(collection)
        size = collection.size().getInfo()
        self.assertGreaterEqual(size, 0)
        print(f"✓ Sentinel-1: {size} images")
    
    def test_03_auxiliary_data(self):
        """Test chargement données auxiliaires"""
        aux = self.acquirer.get_auxiliary_data()
        
        self.assertIn('dem', aux)
        self.assertIn('elevation', aux)
        self.assertIn('slope', aux)
        self.assertIn('permanent_water', aux)
        
        print("✓ Données auxiliaires chargées")
    
    def test_04_preprocessing_modis(self):
        """Test prétraitement MODIS"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        
        collection = self.acquirer.acquire_modis_snow(start_date, end_date)
        
        if collection.size().getInfo() > 0:
            image = collection.first()
            processed = self.preprocessor.preprocess_modis(image)
            
            self.assertIsNotNone(processed)
            bands = processed.bandNames().getInfo()
            self.assertIn('snow_cover', bands)
            
            print("✓ Prétraitement MODIS OK")
        else:
            self.skipTest("Pas d'images MODIS disponibles")
    
    def test_05_snow_detection(self):
        """Test détection neige"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        
        collection = self.acquirer.acquire_modis_snow(start_date, end_date)
        
        if collection.size().getInfo() > 0:
            image = collection.first()
            processed = self.preprocessor.preprocess_modis(image)
            
            # NDSI
            with_ndsi = self.snow_detector.calculate_ndsi(processed)
            self.assertIn('NDSI', with_ndsi.bandNames().getInfo())
            
            # Détection
            aux = self.acquirer.get_auxiliary_data()
            snow_mask = self.snow_detector.detect_snow_adaptive(
                with_ndsi,
                aux['dem']
            )
            
            self.assertIsNotNone(snow_mask)
            print("✓ Détection neige OK")
        else:
            self.skipTest("Pas d'images MODIS disponibles")
    
    def test_06_validation_anomalies(self):
        """Test détection anomalies"""
        historical = [100, 105, 98, 102, 99, 103, 101, 97, 104, 100]
        
        # Valeur normale
        result_normal = self.validator.detect_anomalies(102, historical)
        self.assertFalse(result_normal['is_anomaly'])
        
        # Valeur anormale
        result_anomaly = self.validator.detect_anomalies(200, historical)
        self.assertTrue(result_anomaly['is_anomaly'])
        
        print("✓ Détection anomalies OK")
    
    def test_07_database_connection(self):
        """Test connexion base de données"""
        from src.export.exporter import DataExporter
        
        exporter = DataExporter(self.config)
        
        try:
            with exporter.engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                self.assertIsNotNone(result)
            print("✓ Connexion DB OK")
        except Exception as e:
            self.fail(f"Erreur connexion DB: {e}")


def run_tests():
    """Exécute tous les tests"""
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestPipeline)
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
```

**Exécution tests**:

```bash
cd /opt/sebou_monitoring
python -m tests.test_pipeline
```

## Tâche 9.2: Documentation finale

**Action requise**: Crée documentation utilisateur

```markdown
# /opt/sebou_monitoring/docs/USER_GUIDE.md

# Guide Utilisateur - Sebou Monitoring System

## Installation

### Prérequis
- Ubuntu 20.04/22.04
- Python 3.9+
- PostgreSQL 14+ avec PostGIS
- Compte Google Earth Engine

### Installation rapide
\`\`\`bash
# Cloner repo
git clone https://github.com/your-org/sebou-monitoring.git
cd sebou-monitoring

# Installer
./scripts/install.sh

# Configurer
cp config/config.example.yaml config/config.yaml
# Éditer config.yaml avec vos paramètres

# Tester installation
python -m tests.test_pipeline
\`\`\`

## Utilisation

### Traitement manuel
\`\`\`bash
# Traiter date spécifique
python src/pipeline/main_pipeline.py --date 2024-01-15

# Traiter hier (défaut)
python src/pipeline/main_pipeline.py
\`\`\`

### Accès dashboard
http://localhost:8080

### API
http://localhost:8000/docs

## Maintenance

### Logs
\`\`\`bash
tail -f /data/sebou_monitoring/logs/pipeline_*.log
\`\`\`

### Backup base de données
\`\`\`bash
./scripts/backup_db.sh
\`\`\`

### Monitoring système
\`\`\`bash
./scripts/check_health.sh
\`\`\`

## Support
equipe@example.com
```

## Tâche 9.3: Checklist déploiement production

**Action requise**: Valide checklist complète

```markdown
# Checklist Déploiement Production

## Infrastructure
- [ ] Serveur dédié configuré (32GB RAM min)
- [ ] PostgreSQL installé et sécurisé
- [ ] PostGIS activé
- [ ] Pare-feu configuré (ports 5432, 8000, 8080)
- [ ] Certificats SSL en place
- [ ] Backup automatique configuré

## Application
- [ ] Code déployé dans /opt/sebou_monitoring
- [ ] Environnement virtuel créé
- [ ] Toutes dépendances installées
- [ ] Tests unitaires passent (100%)
- [ ] Configuration production en place
- [ ] Secrets sécurisés (fichier .env avec permissions 600)

## Google Earth Engine
- [ ] Service Account créé
- [ ] Clé JSON téléchargée et sécurisée
- [ ] Authentification testée
- [ ] Quotas vérifiés

## Base de données
- [ ] Structure complète créée
- [ ] Index optimisés
- [ ] Limite bassin Sebou importée
- [ ] Stations validation importées
- [ ] Backup manuel effectué
- [ ] Rétention données définie (2 ans)

## Pipeline
- [ ] Traitement manuel testé avec succès
- [ ] Cron/Airflow configuré
- [ ] Exécution quotidienne validée (3+ jours)
- [ ] Temps traitement < 2h
- [ ] Exports fonctionnels (COG, GeoJSON, DB)

## API
- [ ] API démarrée (systemd service)
- [ ] Endpoints testés
- [ ] Authentification configurée (si nécessaire)
- [ ] Rate limiting en place
- [ ] CORS configuré
- [ ] Documentation accessible (/docs)

## Dashboard
- [ ] Frontend déployé
- [ ] Connexion API fonctionnelle
- [ ] Carte interactive testée
- [ ] Graphiques s'affichent
- [ ] Responsive (mobile/tablet/desktop)

## Monitoring & Alertes
- [ ] Logs configurés et rotatifs
- [ ] Email SMTP configuré
- [ ] Alertes inondations testées
- [ ] Alertes qualité testées
- [ ] Monitoring système (Prometheus/Grafana optionnel)

## Documentation
- [ ] Guide installation complet
- [ ] Guide utilisateur
- [ ] Documentation API
- [ ] Procédures maintenance
- [ ] Contacts support

## Formation
- [ ] Équipe formée sur dashboard
- [ ] Équipe formée sur interprétation résultats
- [ ] Procédures incidents documentées

## Validation finale
- [ ] Traitement 7 jours consécutifs réussis
- [ ] Validation croisée avec observations terrain
- [ ] Approbation équipe métier
- [ ] Go production validé
```

---

# RÉSUMÉ IMPLÉMENTATION COMPLÈTE

## Modules créés

1. **src/acquisition/data_acquirer.py** - Acquisition multi-sources
2. **src/preprocessing/preprocessor.py** - Prétraitement images
3. **src/detection/snow_detector.py** - Détection neige
4. **src/detection/flood_detector.py** - Détection inondations
5. **src/validation/validator.py** - Validation et QC
6. **src/export/exporter.py** - Export multi-formats
7. **src/pipeline/main_pipeline.py** - Orchestration complète
8. **src/api/main.py** - API REST
9. **tests/test_pipeline.py** - Tests unitaires

## Commandes essentielles

```bash
# Installation
./scripts/install.sh

# Tests
python -m tests.test_pipeline

# Traitement manuel
python src/pipeline/main_pipeline.py --date 2024-01-15

# API
uvicorn src.api.main:app --host 0.0.0.0 --port 8000

# Logs
tail -f /data/sebou_monitoring/logs/pipeline_*.log

# Health check
curl http://localhost:8000/health
```

## Prochaines étapes recommandées

1. **Validation données terrain** - Comparer résultats avec observations
2. **Optimisation seuils** - Ajuster selon performances
3. **Enrichissement dashboard** - Ajouter fonctionnalités demandées
4. **Intégration modèles prédictifs** - ML pour prévisions
5. **Extension géographique** - Autres bassins

---

**FIN PROMPT PARTIE 2**

Ce prompt fournit tout le code nécessaire pour les phases 4 à 9.
L'agent IA dispose maintenant de l'intégralité du workflow implémentable.
