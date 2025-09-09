from fastapi import APIRouter
from typing import List
from ... import schemas 

# Create an APIRouter instance
router = APIRouter()

@router.get("/floats", response_model=List[schemas.Float])
def get_all_floats():
    """
    Endpoint to get a list of all available ARGO floats.
    This currently returns mock data.
    """
    # MOCK DATA: Replace this with a real database call later
    mock_floats_data = [
        {"id": 3902581, "project": "Indian Argo Project", "lat": 10.5, "lon": 85.2},
        {"id": 2902391, "project": "US Argo", "lat": -25.1, "lon": -150.8},
        {"id": 6901764, "project": "CSIRO Argo Australia", "lat": -40.3, "lon": 145.6},
        {"id": 1902345, "project": "JMA Argo Japan", "lat": 35.0, "lon": 140.1},
    ]
    return mock_floats_data

@router.post("/query", response_model=schemas.QueryResponse)
def handle_query(query: schemas.QueryRequest):
    """
    Endpoint to handle a natural language query from the user.
    This currently returns a mock response.
    """
    # MOCK RESPONSE: Replace this with your actual AI/RAG pipeline later
    mock_sql = "SELECT * FROM measurements WHERE parameter='DOXY' AND depth > 500;"
    mock_data = [
        {"profile_id": 101, "pressure": 510, "doxy": 205.1},
        {"profile_id": 102, "pressure": 525, "doxy": 204.8},
    ]

    response = schemas.QueryResponse(
        query_text=query.text,
        sql_query=mock_sql,
        data=mock_data
    )
    return response