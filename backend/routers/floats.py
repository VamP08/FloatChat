from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database

router = APIRouter(prefix="/floats", tags=["floats"])

@router.get("/", response_model=List[schemas.FloatChatBase])
def read_floats(skip: int = 0, limit: int = 1000, db: Session = Depends(database.get_db)):
    return crud.get_floats(db, skip=skip, limit=limit)

@router.get("/locations", response_model=List[schemas.FloatLocation]) # <-- CHANGE THIS
def read_all_float_locations(db: Session = Depends(database.get_db)):
    """Endpoint to get the latest known location of all floats."""
    return crud.get_all_float_locations(db)

@router.get("/{float_id}", response_model=schemas.FloatChatBase)
def read_float(float_id: str, db: Session = Depends(database.get_db)):
    db_float = crud.get_float_by_id(db, float_id=float_id)
    if db_float is None:
        raise HTTPException(status_code=404, detail="Float not found")
    return db_float

@router.get("/{float_id}/profiles", response_model=List[schemas.ProfileBase])
def read_profiles(float_id: str, db: Session = Depends(database.get_db)):
    return crud.get_profiles_by_float(db, float_id=float_id)