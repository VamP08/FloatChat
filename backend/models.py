from sqlalchemy import Column, Date, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship

from .database import Base


class ArgoFloat(Base):
    """One Argo profiling float, identified by its WMO number."""

    __tablename__ = "floats"

    id = Column(String, primary_key=True, index=True)
    project_name = Column(String)
    platform_type = Column(String)
    wmo_inst_type = Column(String)
    pi_name = Column(String)
    data_centre = Column(String)
    sensors_list = Column(String)

    profiles = relationship("Profile", back_populates="float", cascade="all, delete-orphan")
    coverage = relationship(
        "ParameterCoverage", back_populates="float", cascade="all, delete-orphan"
    )


class Profile(Base):
    """One dive: a single vertical cast at a point in space and time."""

    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    float_id = Column(String, ForeignKey("floats.id"), index=True)
    cycle_number = Column(Integer)
    profile_date = Column(Date, index=True)
    # Denormalised 'YYYY-MM' so monthly grouping is one indexed equality test rather
    # than a date function, which SQLite and Postgres spell differently.
    year_month = Column(String, index=True)
    latitude = Column(Float)
    longitude = Column(Float)

    float = relationship("ArgoFloat", back_populates="profiles")
    measurements = relationship(
        "Measurement", back_populates="profile", cascade="all, delete-orphan"
    )


class Measurement(Base):
    """One depth level of one profile, after QC filtering and vertical binning."""

    __tablename__ = "measurements"

    profile_id = Column(Integer, ForeignKey("profiles.id"), primary_key=True)
    pressure = Column(Float, primary_key=True)  # decibar, ~1 dbar per metre of depth
    temp = Column(Float, nullable=True)
    psal = Column(Float, nullable=True)
    doxy = Column(Float, nullable=True)
    chla = Column(Float, nullable=True)
    nitrate = Column(Float, nullable=True)
    bbp700 = Column(Float, nullable=True)
    ph = Column(Float, nullable=True)

    profile = relationship("Profile", back_populates="measurements")


class ParameterCoverage(Base):
    """How much usable data each float actually has, per parameter.

    A float's sensor list says which instruments are aboard; it says nothing about
    whether their readings survive quality control. This table records what the
    ingest measured, so the interface can offer only parameters that hold data.
    """

    __tablename__ = "parameter_coverage"

    float_id = Column(String, ForeignKey("floats.id"), primary_key=True)
    parameter = Column(String, primary_key=True)
    n_values = Column(Integer)
    first_date = Column(Date)
    last_date = Column(Date)

    float = relationship("ArgoFloat", back_populates="coverage")


# The map asks for the newest profile per float on every page load.
Index("ix_profiles_float_cycle", Profile.float_id, Profile.cycle_number)
