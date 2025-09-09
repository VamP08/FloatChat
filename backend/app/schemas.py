from pydantic import BaseModel
from typing import List

# --- Schemas for Float Data ---

class Float(BaseModel):
    """
    Represents a single ARGO float with its basic metadata.
    """
    id: int
    project: str
    lat: float
    lon: float

    # This allows the model to be created from ORM objects (like from a database)
    class Config:
        orm_mode = True

# --- Schemas for Querying ---

class QueryRequest(BaseModel):
    """
    Defines the shape of an incoming user query.
    """
    text: str

class QueryResponse(BaseModel):
    """
    Defines the shape of the response sent back after a query.
    """
    query_text: str
    sql_query: str
    data: List[dict] # Sending back a list of generic dictionaries for now