from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, database, schemas

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/{profile_id}/measurements", response_model=List[schemas.MeasurementBase])
def read_measurements_for_profile(profile_id: int, db: Session = Depends(database.get_db)):
    """Every depth level of one profile, shallowest first."""
    measurements = crud.get_measurements_by_profile(db, profile_id=profile_id)
    if not measurements:
        raise HTTPException(status_code=404, detail="No measurements for that profile")
    return measurements
