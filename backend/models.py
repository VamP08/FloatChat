from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class FloatChat(Base):
    __tablename__ = "floats"

    id = Column(String, primary_key=True, index=True)
    project_name = Column(String)
    wmo_inst_type = Column(String)
    sensors_list = Column(String)

    profiles = relationship("Profile", back_populates="float")

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    float_id = Column(String, ForeignKey("floats.id"))
    cycle_number = Column(Integer)
    profile_date = Column(String)  # keep as string for now
    latitude = Column(Float)
    longitude = Column(Float)

    float = relationship("FloatChat", back_populates="profiles")
    measurements = relationship("Measurement", back_populates="profile")


class Measurement(Base):
    __tablename__ = "measurements"

    profile_id = Column(Integer, ForeignKey("profiles.id"), primary_key=True)
    pressure = Column(Float, primary_key=True)  # (unique per depth)
    temp = Column(Float, nullable=True)
    psal = Column(Float, nullable=True)
    doxy = Column(Float, nullable=True)
    chla = Column(Float, nullable=True)
    nitrate = Column(Float, nullable=True)
    bbp700 = Column(Float, nullable=True)
    ph = Column(Float, nullable=True)

    profile = relationship("Profile", back_populates="measurements")
