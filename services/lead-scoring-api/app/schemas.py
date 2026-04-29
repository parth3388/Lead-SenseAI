from pydantic import BaseModel, Field


class LeadCreate(BaseModel):
    """Payload used when a new lead is submitted."""

    age: int = Field(..., ge=0, le=120)
    income: float = Field(..., ge=0)
    browsing_frequency: int = Field(..., ge=0)
    time_spent: float = Field(..., ge=0)
    location_score: float = Field(..., ge=0, le=1)


class LeadResponse(BaseModel):
    id: int
    lead_score: float

    class Config:
        orm_mode = True
