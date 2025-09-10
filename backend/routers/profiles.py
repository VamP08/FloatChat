from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database

router = APIRouter(prefix="/profiles", tags=["profiles"])

@router.get("/{profile_id}/measurements", response_model=List[schemas.MeasurementBase])
def read_measurements_for_profile(profile_id: int, db: Session = Depends(database.get_db)):
    """Endpoint to get all measurement data for a specific profile."""
    measurements = crud.get_measurements_by_profile(db, profile_id=profile_id)
    return measurements