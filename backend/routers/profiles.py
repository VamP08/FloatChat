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

@router.get("/{float_id}/profiles_with_data", response_model=List[schemas.ProfileBase])
def read_profiles_with_data(float_id: str, db: Session = Depends(database.get_db)):
    """
    Gets a list of profiles for a float that are guaranteed to have
    scientific measurement data.
    """
    return crud.get_profiles_with_data_by_float(db, float_id=float_id)