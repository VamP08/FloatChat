from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class FloatLocation(BaseModel):
    id: str
    project_name: str
    latitude: float
    longitude: float
    profile_date: str

    class Config:
        from_attributes = True
        
class MeasurementBase(BaseModel):
    pressure: float
    temp: Optional[float]
    psal: Optional[float]
    doxy: Optional[float]
    chla: Optional[float]
    nitrate: Optional[float]
    bbp700: Optional[float]
    ph: Optional[float]

    class Config:
        from_attributes = True


class ProfileBase(BaseModel):
    id: int
    cycle_number: int
    profile_date: str
    latitude: float
    longitude: float

    class Config:
        from_attributes = True


class FloatChatBase(BaseModel):
    id: str
    project_name: str
    wmo_inst_type: str
    sensors_list: str

    class Config:
        from_attributes = True

class VisualizationData(BaseModel):
    chart_type: str  # 'line', 'scatter', 'bar', 'comparison'
    title: str
    data: List[Dict[str, Any]]
    parameters: Dict[str, Any]  # Chart configuration like x_axis, y_axis, etc.

class ChatMessage(BaseModel):
    role: str 
    content: str
    visualization: Optional[VisualizationData] = None

class ChatRequest(BaseModel):
    history: List[ChatMessage]

class TimeSeriesData(BaseModel):
    profile_date: str
    pressure: float
    temp: Optional[float]
    psal: Optional[float]
    doxy: Optional[float]
    chla: Optional[float]
    nitrate: Optional[float]

    class Config:
        from_attributes = True