from sqlalchemy.orm import Session
from sqlalchemy import cast, Integer
from . import models

def get_floats(db: Session, skip: int = 0, limit: int = 1000):
    """Fetch all floats, sorted by ID for consistency."""
    return db.query(models.FloatChat).order_by(models.FloatChat.id).offset(skip).limit(limit).all()

def get_float_by_id(db: Session, float_id: str):
    """Gets a single float by its ID."""
    return db.query(models.FloatChat).filter(models.FloatChat.id == float_id).first()

def get_profiles_by_float(db: Session, float_id: str):
    """Gets all profiles for a float, SORTED by cycle number."""
    return (
        db.query(models.Profile)
        .filter(models.Profile.float_id == float_id)
        .order_by(models.Profile.cycle_number)
        .all()
    )

def get_measurements_by_profile(db: Session, profile_id: int):
    """Gets all measurements for a profile, SORTED by pressure."""
    return (
        db.query(models.Measurement)
        .filter(cast(models.Measurement.profile_id, Integer) == profile_id)
        .order_by(models.Measurement.pressure)
        .all()
    )