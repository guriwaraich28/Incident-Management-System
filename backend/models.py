from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    component_id = Column(String, index=True)
    severity = Column(String)
    status = Column(String, default="OPEN")
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    mttr = Column(Float, nullable=True)

    # relationship
    rcas = relationship("RCA", back_populates="incident")


class RCA(Base):
    __tablename__ = "rca"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    root_cause_category = Column(String)
    fix_applied = Column(Text)
    prevention_steps = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    # relationship
    incident = relationship("Incident", back_populates="rcas")