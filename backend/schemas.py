from pydantic import BaseModel
from typing import List, Optional

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

class ChatMessage(BaseModel):
    role: str 
    content: str

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