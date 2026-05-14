from __future__ import annotations

from dataclasses import dataclass
import logging
from typing import Optional

try:
    import ee  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    ee = None

logger = logging.getLogger(__name__)


def require_ee():
    """Return earthengine-api module or raise a clear error."""
    if ee is None:
        raise RuntimeError(
            "earthengine-api is not installed. Install Sebou dependencies first "
            "(see backend/requirements-sebou.txt)."
        )
    return ee


@dataclass(frozen=True)
class GeeAuthConfig:
    project: Optional[str] = None
    service_account: Optional[str] = None
    key_file: Optional[str] = None


def initialize_gee(auth: Optional[GeeAuthConfig] = None, interactive: bool = False) -> None:
    """
    Initialize Google Earth Engine.

    - Service-account mode when credentials are provided.
    - Fallback to default local auth.
    - Optional interactive auth for development.
    """
    ee_module = require_ee()
    auth = auth or GeeAuthConfig()

    if auth.service_account and auth.key_file:
        logger.info("Initializing GEE using service account credentials.")
        credentials = ee_module.ServiceAccountCredentials(auth.service_account, auth.key_file)
        ee_module.Initialize(credentials, project=auth.project)
        return

    if interactive:
        logger.info("Running interactive GEE authentication.")
        ee_module.Authenticate()

    logger.info("Initializing GEE using default credentials.")
    ee_module.Initialize(project=auth.project)
