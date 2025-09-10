from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database

router = APIRouter(prefix="/floats", tags=["floats"])

@router.get("/", response_model=List[schemas.FloatChatBase])
def read_floats(skip: int = 0, limit: int = 1000, db: Session = Depends(database.get_db)):
    """Gets a list of all floats."""
    return crud.get_floats(db, skip=skip, limit=limit)


@router.get("/locations", response_model=List[schemas.FloatLocation])
def read_all_float_locations(db: Session = Depends(database.get_db)):
    """Endpoint to get the latest known location of all floats."""
    return crud.get_all_float_locations(db)

@router.get("/locations/active", response_model=List[schemas.FloatLocation])
def read_active_float_locations(db: Session = Depends(database.get_db)):
    """
    Endpoint to get the latest known location of only the floats that have
    at least one profile with scientific data.
    """
    return crud.get_locations_for_active_floats(db)

@router.get("/{float_id}", response_model=schemas.FloatChatBase)
def read_float(float_id: str, db: Session = Depends(database.get_db)):
    """Gets metadata for a single, specific float."""
    db_float = crud.get_float_by_id(db, float_id=float_id)
    if db_float is None:
        raise HTTPException(status_code=404, detail="Float not found")
    return db_float


@router.get("/{float_id}/profiles", response_model=List[schemas.ProfileBase])
def read_profiles(float_id: str, db: Session = Depends(database.get_db)):
    """Gets all profiles for a specific float (used for trajectory)."""
    return crud.get_profiles_by_float(db, float_id=float_id)

@router.get("/{float_id}/profiles_with_data", response_model=List[schemas.ProfileBase])
def read_profiles_with_data(float_id: str, db: Session = Depends(database.get_db)):
    """
    Gets a list of profiles for a float that are guaranteed to have
    scientific measurement data.
    """
    return crud.get_profiles_with_data_by_float(db, float_id=float_id)

@router.get("/{float_id}/trajectory", response_model=List[schemas.ProfileBase])
def read_float_trajectory(float_id: str, db: Session = Depends(database.get_db)):
    """Gets all profiles for a float, to be used for drawing its path."""
    return crud.get_profiles_by_float(db, float_id=float_id)