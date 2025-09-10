from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database

router = APIRouter(prefix="/floats", tags=["floats"])

@router.get("/", response_model=List[schemas.FloatChatBase])
def read_floats(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return crud.get_floats(db, skip=skip, limit=limit)

@router.get("/{float_id}", response_model=schemas.FloatChatBase)
def read_float(float_id: int, db: Session = Depends(database.get_db)):
    return crud.get_float_by_id(db, float_id=float_id)

@router.get("/{float_id}/profiles", response_model=List[schemas.ProfileBase])
def read_profiles(float_id: int, db: Session = Depends(database.get_db)):
    return crud.get_profiles_by_float(db, float_id=float_id)