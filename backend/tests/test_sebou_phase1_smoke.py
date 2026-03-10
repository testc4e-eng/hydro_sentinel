from pathlib import Path

from app.sebou_monitoring.config import SebouMonitoringSettings


def test_load_example_config():
    backend_root = Path(__file__).resolve().parents[1]
    cfg = backend_root / "config" / "sebou" / "config.example.yaml"

    settings = SebouMonitoringSettings.from_yaml(cfg)

    assert settings.sensors.modis_collection == "MODIS/006/MOD10A1"
    assert settings.sensors.modis_scale_m == 500
    assert settings.snow_detection.ndsi_threshold_high_elev > 0


def test_module_imports_without_runtime_side_effects():
    # Imports must be safe even when GEE is not initialized.
    from app.sebou_monitoring.acquisition import SebouDataAcquirer  # noqa: F401
    from app.sebou_monitoring.detection import SnowDetector  # noqa: F401
    from app.sebou_monitoring.preprocessing import ImagePreprocessor  # noqa: F401
