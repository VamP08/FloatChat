from sqlalchemy.orm import Session
from . import models

def get_floats(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.FloatChat).offset(skip).limit(limit).all()

def get_float_by_id(db: Session, float_id: int):
    return db.query(models.FloatChat).filter(models.FloatChat.id == float_id).first()

def get_profiles_by_float(db: Session, float_id: int):
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
        .filter(models.Measurement.profile_id == profile_id)
        .order_by(models.Measurement.pressure)
        .all()
    )