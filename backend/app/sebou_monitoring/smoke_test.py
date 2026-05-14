from __future__ import annotations

import argparse
from datetime import datetime, timedelta
import logging
from pathlib import Path

from .acquisition import SebouDataAcquirer
from .config import SebouMonitoringSettings
from .detection import SnowDetector
from .gee_client import GeeAuthConfig, initialize_gee
from .preprocessing import ImagePreprocessor


def run_smoke(config_path: str, with_gee: bool = False, interactive_auth: bool = False) -> None:
    settings = SebouMonitoringSettings.from_yaml(config_path)
    logging.info("Config loaded from %s", config_path)

    if not with_gee:
        logging.info("Smoke check completed (config + imports only).")
        return

    auth = GeeAuthConfig(
        project=settings.gee.project,
        service_account=settings.gee.service_account,
        key_file=settings.gee.key_file,
    )
    initialize_gee(auth=auth, interactive=interactive_auth)
    logging.info("GEE initialized.")

    acquirer = SebouDataAcquirer(settings=settings, auto_initialize_gee=False)
    preprocessor = ImagePreprocessor()
    detector = SnowDetector(settings.snow_detection)

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)

    modis = acquirer.acquire_modis_snow(start_date, end_date)
    first_modis = modis.first()

    modis_pre = preprocessor.preprocess_modis(first_modis)
    aux = acquirer.get_auxiliary_data()
    snow_mask = detector.detect_snow_adaptive(modis_pre, aux["dem"], sensor="modis")
    snow_mask = detector.post_process_snow_mask(snow_mask)
    metrics = detector.calculate_snow_metrics(
        snow_mask=snow_mask,
        basin_boundary=acquirer.basin,
        dem=aux["dem"],
        scale_m=settings.sensors.modis_scale_m,
    )

    logging.info(
        "GEE smoke outputs ready (server-side objects): %s",
        ", ".join(sorted(metrics.keys())),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Sebou phase-1 smoke test")
    parser.add_argument(
        "--config",
        default=str(Path(__file__).resolve().parents[2] / "config" / "sebou" / "config.example.yaml"),
        help="Path to Sebou YAML config",
    )
    parser.add_argument("--with-gee", action="store_true", help="Run online GEE smoke checks")
    parser.add_argument(
        "--interactive-auth",
        action="store_true",
        help="Use ee.Authenticate() before ee.Initialize()",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
    run_smoke(config_path=args.config, with_gee=args.with_gee, interactive_auth=args.interactive_auth)


if __name__ == "__main__":
    main()
