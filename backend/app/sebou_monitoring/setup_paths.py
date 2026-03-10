from __future__ import annotations

from pathlib import Path
from typing import List

from .config import SebouMonitoringSettings


def ensure_data_directories(config_path: str) -> List[Path]:
    settings = SebouMonitoringSettings.from_yaml(config_path)
    raw = settings.raw
    paths = raw.get("paths", {})
    data_root = Path(paths.get("data_root", "./data/sebou_monitoring"))

    targets = [
        data_root,
        Path(paths.get("raw_data", str(data_root / "raw"))),
        Path(paths.get("processed_data", str(data_root / "processed"))),
        Path(paths.get("products", str(data_root / "products"))),
        Path(paths.get("logs", str(data_root / "logs"))),
        data_root / "raw" / "modis",
        data_root / "raw" / "sentinel1",
        data_root / "raw" / "sentinel2",
        data_root / "raw" / "auxiliary",
        data_root / "processed" / "snow",
        data_root / "processed" / "flood",
        data_root / "processed" / "masks",
        data_root / "products" / "cog",
        data_root / "products" / "vectors",
        data_root / "products" / "statistics",
        data_root / "products" / "thumbnails",
        data_root / "validation" / "stations",
        data_root / "validation" / "field_data",
        data_root / "validation" / "reports",
        data_root / "metadata",
    ]

    created = []
    for target in targets:
        target.mkdir(parents=True, exist_ok=True)
        created.append(target)

    return created
