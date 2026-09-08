from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models


def get_floats(db: Session, skip: int = 0, limit: int = 1000):
    """Every float, ordered by WMO number so the list is stable between requests."""
    return (
        db.query(models.ArgoFloat)
        .order_by(models.ArgoFloat.id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_float_by_id(db: Session, float_id: str):
    return db.query(models.ArgoFloat).filter(models.ArgoFloat.id == float_id).first()


def get_profiles_by_float(db: Session, float_id: str):
    """All profiles for one float in cycle order, which is also the path it travelled."""
    return (
        db.query(models.Profile)
        .filter(models.Profile.float_id == float_id)
        .order_by(models.Profile.cycle_number)
        .all()
    )


def get_measurements_by_profile(db: Session, profile_id: int):
    return (
        db.query(models.Measurement)
        .filter(models.Measurement.profile_id == profile_id)
        .order_by(models.Measurement.pressure)
        .all()
    )


def get_float_coverage(db: Session, float_id: str):
    """Which parameters this float actually has data for, and how much.

    Drives the parameter selector: offering oxygen for a float whose oxygen readings
    all failed QC produces an empty chart and no explanation.
    """
    return (
        db.query(models.ParameterCoverage)
        .filter(models.ParameterCoverage.float_id == float_id)
        .order_by(models.ParameterCoverage.n_values.desc())
        .all()
    )


def _latest_profile_subquery():
    """The most recent cycle number per float."""
    return (
        select(
            models.Profile.float_id,
            func.max(models.Profile.cycle_number).label("max_cycle"),
        )
        .group_by(models.Profile.float_id)
        .subquery()
    )


def get_all_float_locations(db: Session):
    """Where every float last surfaced -- one marker per float for the map."""
    latest = _latest_profile_subquery()
    return (
        db.query(
            models.ArgoFloat.id,
            models.ArgoFloat.project_name,
            models.Profile.latitude,
            models.Profile.longitude,
            models.Profile.profile_date,
        )
        .join(latest, models.ArgoFloat.id == latest.c.float_id)
        .join(
            models.Profile,
            (models.Profile.float_id == latest.c.float_id)
            & (models.Profile.cycle_number == latest.c.max_cycle),
        )
        .all()
    )


def get_locations_for_active_floats(db: Session):
    """As above, but only floats that carry measurements.

    Every ingested float has measurements by construction, so this now differs from
    get_all_float_locations only if the database was loaded another way. It is kept
    because the map calls it and the guarantee is worth stating in the query.
    """
    with_data = (
        select(models.Profile.float_id)
        .join(models.Measurement, models.Measurement.profile_id == models.Profile.id)
        .distinct()
        .subquery()
    )
    latest = _latest_profile_subquery()
    return (
        db.query(
            models.ArgoFloat.id,
            models.ArgoFloat.project_name,
            models.Profile.latitude,
            models.Profile.longitude,
            models.Profile.profile_date,
        )
        .join(with_data, models.ArgoFloat.id == with_data.c.float_id)
        .join(latest, models.ArgoFloat.id == latest.c.float_id)
        .join(
            models.Profile,
            (models.Profile.float_id == latest.c.float_id)
            & (models.Profile.cycle_number == latest.c.max_cycle),
        )
        .all()
    )


def get_profiles_with_data_by_float(db: Session, float_id: str):
    """Profiles that hold measurements, so the list never offers an empty chart."""
    return (
        db.query(models.Profile)
        .join(models.Measurement, models.Measurement.profile_id == models.Profile.id)
        .filter(models.Profile.float_id == float_id)
        .distinct()
        .order_by(models.Profile.cycle_number)
        .all()
    )


def get_full_timeseries_by_float(db: Session, float_id: str, depth_max: float | None = None):
    """This float's readings over time, in time order.

    Bounded by depth because the whole water column plotted on one axis is a cloud
    rather than a series: the longest record here is 44,310 readings, which is several
    megabytes of JSON and a scatter plot dense enough to look broken. One layer of water
    over twelve years is both readable and quick.
    """
    query = (
        db.query(
            models.Profile.profile_date,
            models.Measurement.pressure,
            models.Measurement.temp,
            models.Measurement.psal,
            models.Measurement.doxy,
            models.Measurement.chla,
            models.Measurement.nitrate,
        )
        .join(models.Measurement, models.Measurement.profile_id == models.Profile.id)
        .filter(models.Profile.float_id == float_id)
    )
    if depth_max is not None:
        query = query.filter(models.Measurement.pressure <= depth_max)
    return query.order_by(
        models.Profile.profile_date, models.Measurement.pressure
    ).all()
