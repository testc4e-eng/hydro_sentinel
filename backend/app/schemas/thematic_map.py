from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict


MapType = Literal["flood", "snow"]
LayerKind = Literal["raster", "binary_mask", "reference", "vector"]
LayerSourceType = Literal["xyz", "geojson"]


class SurfaceStat(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    m2: float
    km2: float
    hectares: float
    percentage: float


class MapStatistics(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    positive_class_label: str
    negative_class_label: str
    positive_class: SurfaceStat
    negative_class: SurfaceStat
    total_area_m2: float


class LegendItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    label: str
    color: str


class MapLayer(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    kind: LayerKind
    source_type: LayerSourceType
    visible: bool = True
    opacity: float = 0.7
    asset_path: Optional[str] = None
    tiles: Optional[List[str]] = None
    geojson: Optional[Dict[str, Any]] = None
    paint: Optional[Dict[str, Any]] = None
    legend: List[LegendItem] = []
    minzoom: Optional[int] = None
    maxzoom: Optional[int] = None


class ProcessingStep(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    label: str
    description: str


class ThematicMapProduct(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    event_name: str
    acquisition_start: datetime
    acquisition_end: datetime
    published_at: datetime
    satellite: str
    status: str
    bbox: List[float]
    statistics: MapStatistics
    layers: List[MapLayer]


class ThematicMapProductSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    event_name: str
    acquisition_start: datetime
    acquisition_end: datetime
    published_at: datetime
    satellite: str
    status: str
    statistics: MapStatistics


class ThematicMapCatalog(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    map_type: MapType
    title: str
    description: str
    processing_chain: List[ProcessingStep]
    latest_product_id: Optional[str] = None
    products: List[ThematicMapProductSummary]


class ThematicMapDataFile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    map_type: MapType
    title: str
    description: str
    processing_chain: List[ProcessingStep]
    products: List[ThematicMapProduct]
