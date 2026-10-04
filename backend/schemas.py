from datetime import date
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class FloatLocation(BaseModel):
    """One map marker: where a float last surfaced."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    project_name: Optional[str] = None
    latitude: float
    longitude: float
    profile_date: date


class MeasurementBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    pressure: float
    temp: Optional[float] = None
    psal: Optional[float] = None
    doxy: Optional[float] = None
    chla: Optional[float] = None
    nitrate: Optional[float] = None
    bbp700: Optional[float] = None
    ph: Optional[float] = None


class ProfileBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cycle_number: int
    profile_date: date
    latitude: float
    longitude: float


class FloatDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_name: Optional[str] = None
    platform_type: Optional[str] = None
    wmo_inst_type: Optional[str] = None
    pi_name: Optional[str] = None
    data_centre: Optional[str] = None
    sensors_list: Optional[str] = None


class ParameterCoverageBase(BaseModel):
    """How much usable data a float holds for one parameter."""

    model_config = ConfigDict(from_attributes=True)

    parameter: str
    n_values: int
    first_date: date
    last_date: date


class TimeSeriesData(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    profile_date: date
    pressure: float
    temp: Optional[float] = None
    psal: Optional[float] = None
    doxy: Optional[float] = None
    chla: Optional[float] = None
    nitrate: Optional[float] = None


class VisualizationData(BaseModel):
    chart_type: str  # line, scatter, bar, table
    title: str
    data: List[Dict[str, Any]]
    parameters: Dict[str, Any]  # axis names and grouping for the chart to render


class ChatMessage(BaseModel):
    role: str
    content: str = Field(max_length=2000)
    visualization: Optional[VisualizationData] = None


class ChatRequest(BaseModel):
    # Only the last message is read; the bound stops a request carrying a novel.
    history: List[ChatMessage] = Field(max_length=20)
