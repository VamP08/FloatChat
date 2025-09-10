from sqlalchemy.orm import Session
from sqlalchemy import cast, Integer, func 
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

def get_all_float_locations(db: Session):
    """
    Gets the most recent location for every float.
    This uses a subquery to find the latest profile for each float_id
    and then joins to get the location details.
    """
    # Subquery to find the max cycle_number for each float
    latest_profile_sq = (
        db.query(
            models.Profile.float_id,
            func.max(models.Profile.cycle_number).label("max_cycle")
        )
        .group_by(models.Profile.float_id)
        .subquery()
    )

    # Main query to join floats with their latest profile to get lat/lon
    results = (
        db.query(
            models.FloatChat.id,
            models.FloatChat.project_name,
            models.Profile.latitude,
            models.Profile.longitude,
            models.Profile.profile_date
        )
        .join(latest_profile_sq, models.FloatChat.id == latest_profile_sq.c.float_id)
        .join(
            models.Profile,
            (models.Profile.float_id == latest_profile_sq.c.float_id) &
            (models.Profile.cycle_number == latest_profile_sq.c.max_cycle)
        )
        .all()
    )
    return results