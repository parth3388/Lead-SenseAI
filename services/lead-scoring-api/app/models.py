from sqlalchemy import Column, Integer, Float, String, Boolean
from .database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    age = Column(Integer, nullable=False)
    income = Column(Float, nullable=False)
    browsing_frequency = Column(Integer, nullable=False)
    time_spent = Column(Float, nullable=False)
    location_score = Column(Float, nullable=False)
    lead_score = Column(Float, nullable=False)
    converted = Column(Boolean, default=False)

    def __repr__(self) -> str:  # pragma: no cover - simple helper
        return f"<Lead id={self.id} score={self.lead_score:.2f}>"


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    points = Column(Integer, default=0)

    def __repr__(self) -> str:
        return f"<Agent id={self.id} name={self.name}>"
