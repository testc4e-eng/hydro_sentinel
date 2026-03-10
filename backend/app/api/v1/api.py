
from fastapi import APIRouter
from app.api.v1.endpoints import (
    admin_new,
    auth,
    dashboard,
    data_availability,
    health,
    ingest,
    measurements,
    sites,
    thematic_maps,
    ts_management,
    variables,
)

api_router = APIRouter()

api_router.include_router(auth.router, tags=["login"])
api_router.include_router(sites.router, tags=["sites"])
api_router.include_router(measurements.router, prefix="/measurements", tags=["measurements"])
api_router.include_router(dashboard.router, tags=["dashboard"])
api_router.include_router(variables.router, tags=["variables"])
api_router.include_router(admin_new.router, prefix="/admin", tags=["admin"])
api_router.include_router(data_availability.router, prefix="/admin", tags=["admin"])

api_router.include_router(ingest.router, prefix="/ingest", tags=["ingestion"])
api_router.include_router(thematic_maps.router, tags=["thematic_maps"])
api_router.include_router(health.router, tags=["health"])

from app.api.v1.endpoints import test_geo
api_router.include_router(test_geo.router, prefix="/test", tags=["testing"])

# Time series management
api_router.include_router(ts_management.router, prefix="/admin", tags=["timeseries"])
