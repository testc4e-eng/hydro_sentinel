from __future__ import annotations

from datetime import datetime
import logging

import pytest

from app.sebou_monitoring.config import FloodDetectionConfig
from app.sebou_monitoring.detection import flood_detector as flood_detector_module
from app.sebou_monitoring.export.exporter import _ee_number_to_float
from app.sebou_monitoring.pipeline.main_pipeline import SebouMonitoringPipeline
from app.sebou_monitoring.validation.validator import DataValidator


class _DummyCollection:
    def __init__(self) -> None:
        self.filtered_range: tuple[str, str] | None = None

    def filterDate(self, start: str, end: str) -> "_DummyCollection":
        self.filtered_range = (start, end)
        return self

    def median(self) -> str:
        return "median-composite"

    def mean(self) -> str:
        return "mean-composite"


class _DummyEeNumber:
    def __init__(self, value: float) -> None:
        self._value = value

    def getInfo(self) -> float:
        return self._value


def test_phase4_flood_reference_composite_supports_expected_methods(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(flood_detector_module, "require_ee", lambda: object())
    detector = flood_detector_module.FloodDetector(FloodDetectionConfig())

    collection = _DummyCollection()
    start = datetime(2026, 3, 1)
    end = datetime(2026, 3, 6)

    median = detector.create_reference_composite(collection, start, end, method="median")
    assert median == "median-composite"
    assert collection.filtered_range == ("2026-03-01", "2026-03-06")

    mean = detector.create_reference_composite(collection, start, end, method="mean")
    assert mean == "mean-composite"

    with pytest.raises(ValueError):
        detector.create_reference_composite(collection, start, end, method="max")


def test_phase5_validator_detect_anomalies_flags_outlier():
    validator = DataValidator()
    historical = [100, 105, 98, 102, 99, 103, 101, 97, 104, 100]

    normal = validator.detect_anomalies(102, historical)
    assert normal["is_anomaly"] is False
    assert "z_score" in normal

    anomaly = validator.detect_anomalies(200, historical)
    assert anomaly["is_anomaly"] is True
    assert anomaly["anomaly_type"] == "high"


def test_phase6_ee_number_to_float_handles_none_scalar_and_getinfo():
    assert _ee_number_to_float(None) is None
    assert _ee_number_to_float(12) == 12.0
    assert _ee_number_to_float(12.5) == 12.5
    assert _ee_number_to_float(_DummyEeNumber(7.25)) == 7.25


def test_phase7_pipeline_flood_trigger_defaults_enabled(caplog: pytest.LogCaptureFixture):
    pipeline = SebouMonitoringPipeline.__new__(SebouMonitoringPipeline)
    pipeline.logger = logging.getLogger("test.sebou.pipeline")

    with caplog.at_level(logging.INFO):
        enabled = pipeline._check_flood_trigger(datetime(2026, 3, 6))

    assert enabled is True
    assert "defaults to enabled" in caplog.text
