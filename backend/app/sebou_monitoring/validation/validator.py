from __future__ import annotations

from datetime import datetime
import logging
from typing import Dict, Iterable, List, Optional

import numpy as np

try:
    import geopandas as gpd  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    gpd = None

from ..gee_client import require_ee


class DataValidator:
    """Cross-validation, anomaly detection and quality reporting."""

    def __init__(self) -> None:
        self.logger = logging.getLogger(__name__)
        self._ee = None

    @property
    def ee(self):
        if self._ee is None:
            self._ee = require_ee()
        return self._ee

    def cross_validate_snow(self, modis_snow, sentinel2_snow, basin, scale_m: int = 500) -> Dict[str, object]:
        s2_resampled = sentinel2_snow.reduceResolution(
            reducer=self.ee.Reducer.mean(),
            maxPixels=1024,
        ).reproject(crs=modis_snow.projection(), scale=scale_m)

        s2_binary = s2_resampled.gt(0.5)
        agreement = modis_snow.eq(s2_binary)
        disagreement = modis_snow.neq(s2_binary)

        agreement_stats = agreement.reduceRegion(
            reducer=self.ee.Reducer.mean(),
            geometry=basin,
            scale=scale_m,
            maxPixels=1e10,
        )

        return {
            "agreement_rate": self.ee.Number(agreement_stats.values().get(0)).multiply(100),
            "agreement_map": agreement,
            "disagreement_map": disagreement,
        }

    def validate_with_stations(self, snow_mask, station_points, date: datetime, scale_m: int = 500) -> Optional[Dict[str, object]]:
        if gpd is None:
            raise RuntimeError("geopandas is required for station validation.")
        if not isinstance(station_points, gpd.GeoDataFrame):
            raise TypeError("station_points must be a GeoDataFrame.")

        target_date = date.date()
        observations = station_points.copy()

        if "observation_date" in observations.columns:
            observations["observation_date"] = observations["observation_date"].apply(_coerce_date)
            observations = observations[observations["observation_date"] == target_date]

        if observations.empty:
            self.logger.warning("No field observations available for %s", target_date.isoformat())
            return None

        features = []
        for _, row in observations.iterrows():
            point = self.ee.Geometry.Point([row.geometry.x, row.geometry.y])
            features.append(
                self.ee.Feature(
                    point,
                    {
                        "station_id": row.get("station_id"),
                        "snow_observed": int(row.get("snow_presence", row.get("snow_observed", 0))),
                    },
                )
            )

        station_fc = self.ee.FeatureCollection(features)
        predicted = snow_mask.reduceRegions(
            collection=station_fc,
            reducer=self.ee.Reducer.first(),
            scale=scale_m,
        )

        predicted_features = predicted.getInfo().get("features", [])
        tp = fp = tn = fn = 0

        for feature in predicted_features:
            props = feature.get("properties", {})
            observed = int(props.get("snow_observed", 0))
            predicted_value = int(bool(props.get("first", 0)))

            if observed == 1 and predicted_value == 1:
                tp += 1
            elif observed == 0 and predicted_value == 1:
                fp += 1
            elif observed == 0 and predicted_value == 0:
                tn += 1
            else:
                fn += 1

        total = tp + fp + tn + fn
        accuracy = (tp + tn) / total if total else 0.0
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1_score = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0

        return {
            "confusion_matrix": {"TP": tp, "FP": fp, "TN": tn, "FN": fn},
            "accuracy": accuracy,
            "precision": precision,
            "recall": recall,
            "f1_score": f1_score,
            "n_stations": len(predicted_features),
        }

    def detect_anomalies(
        self,
        current_value: float,
        historical_data: Iterable[float],
        threshold_zscore: float = 2.5,
    ) -> Dict[str, object]:
        values = [float(value) for value in historical_data]
        if len(values) < 10:
            return {"is_anomaly": False, "reason": "insufficient_data"}

        mean = float(np.mean(values))
        std = float(np.std(values))
        if std == 0:
            return {"is_anomaly": False, "reason": "zero_variance"}

        z_score = (current_value - mean) / std
        is_anomaly = abs(z_score) > threshold_zscore

        return {
            "is_anomaly": is_anomaly,
            "z_score": float(z_score),
            "mean": mean,
            "std": std,
            "current_value": float(current_value),
            "anomaly_type": "high" if is_anomaly and z_score > 0 else "low" if is_anomaly else None,
        }

    def temporal_consistency_check(self, current_image, previous_image, max_change_threshold: float = 0.3) -> Dict[str, object]:
        difference = current_image.subtract(previous_image).abs()
        suspicious = difference.gt(max_change_threshold)

        suspicious_stats = suspicious.reduceRegion(
            reducer=self.ee.Reducer.mean(),
            scale=500,
            maxPixels=1e10,
        )

        suspicious_percentage = self.ee.Number(suspicious_stats.values().get(0)).multiply(100)
        return {
            "is_temporally_consistent": suspicious_percentage.lt(10),
            "suspicious_change_percentage": suspicious_percentage,
        }

    def generate_quality_report(self, image, mask, basin, sensor: str, date: datetime, scale_m: int = 500) -> Dict[str, object]:
        report: Dict[str, object] = {
            "date": date.strftime("%Y-%m-%d"),
            "sensor": sensor,
            "quality_flags": [],
        }

        property_names = image.propertyNames()
        if property_names.contains("CLOUDY_PIXEL_PERCENTAGE").getInfo():
            cloud_cover = self.ee.Number(image.get("CLOUDY_PIXEL_PERCENTAGE"))
            report["cloud_cover_percentage"] = float(cloud_cover.getInfo())
            if cloud_cover.gt(30).getInfo():
                report["quality_flags"].append("HIGH_CLOUD_COVER")

        valid_pixels = mask.reduceRegion(
            reducer=self.ee.Reducer.count(),
            geometry=basin,
            scale=scale_m,
            maxPixels=1e10,
        )
        total_pixels = self.ee.Image.constant(1).clip(basin).reduceRegion(
            reducer=self.ee.Reducer.count(),
            geometry=basin,
            scale=scale_m,
            maxPixels=1e10,
        )

        coverage = self.ee.Number(valid_pixels.values().get(0)).divide(total_pixels.values().get(0)).multiply(100)
        coverage_value = float(coverage.getInfo())
        report["spatial_coverage_percentage"] = coverage_value

        if coverage.lt(80).getInfo():
            report["quality_flags"].append("LOW_SPATIAL_COVERAGE")

        quality_score = 100
        if "HIGH_CLOUD_COVER" in report["quality_flags"]:
            quality_score -= 30
        if "LOW_SPATIAL_COVERAGE" in report["quality_flags"]:
            quality_score -= 20

        report["quality_score"] = max(0, quality_score)
        return report


def _coerce_date(value):
    if isinstance(value, datetime):
        return value.date()
    if hasattr(value, "date"):
        try:
            return value.date()
        except Exception:
            return value
    return value
