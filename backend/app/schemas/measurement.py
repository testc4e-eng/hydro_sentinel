from typing import Optional, Any, Union
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class TimeseriesPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    time: datetime
    station_id: Union[str, UUID]
    variable_code: str
    source_code: str
    run_time: Optional[datetime] = None
    value: float
    unit: Optional[str] = None

class TopCriticalItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    station_id: Union[str, UUID]
    station_name: str
    basin_name: Optional[str] = None
    precip_cum_24h_mm: Optional[float] = None
    debit_max_24h_m3s: Optional[float] = None
    lacher_max_24h_m3s: Optional[float] = None
    severity: str
    score: float

class MapKPIItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    station_id: Union[str, UUID]
    station_code: Optional[str] = None
    station_name: str
    station_type: Optional[str] = None
    basin_id: Optional[Union[str, UUID]] = None
    basin_code: Optional[str] = None
    basin_name: Optional[str] = None
    is_active: Optional[bool] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    severity: Optional[str] = None
    score: Optional[float] = None
    kpi_source: Optional[str] = None
    kpi_run_time: Optional[datetime] = None
    last_data_time: Optional[datetime] = None
    precip_obs_mm: Optional[float] = None
    precip_obs_time: Optional[datetime] = None
    precip_arome_mm: Optional[float] = None
    precip_ecmwf_mm: Optional[float] = None
    precip_ecmwf_time: Optional[datetime] = None
    debit_obs_m3s: Optional[float] = None
    debit_sim_m3s: Optional[float] = None
    debit_obs_time: Optional[datetime] = None
    lacher_m3s_latest: Optional[float] = None
    lacher_m3s_time: Optional[datetime] = None
    volume_hm3_latest: Optional[float] = None
    volume_obs_hm3: Optional[float] = None
    volume_sim_hm3: Optional[float] = None
    volume_hm3_time: Optional[datetime] = None
    precip_cum_24h_mm: Optional[float] = None
    debit_max_24h_m3s: Optional[float] = None
    lacher_max_24h_m3s: Optional[float] = None
    apport_max_24h_m3s: Optional[float] = None


