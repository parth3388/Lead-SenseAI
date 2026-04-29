import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from . import models, schemas
from .database import SessionLocal
from .services.lead_service import create_lead as create_lead_service

router = APIRouter()
logger = logging.getLogger(__name__)


def get_db():
    """Dependency that provides a new database session for each request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/lead/", response_model=schemas.LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(
    lead: schemas.LeadCreate, db: Session = Depends(get_db)
) -> models.Lead:
    """Create a lead and store it in the database after scoring."""
    try:
        db_lead = create_lead_service(db, lead)
        logger.debug("created lead %s", db_lead)
        return db_lead
    except Exception as exc:  # pragma: no cover - bubble up for now
        logger.exception("failed to create lead")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="unable to create lead",
        )


@router.get("/leads/", response_model=List[schemas.LeadResponse])
def list_leads(db: Session = Depends(get_db)) -> List[models.Lead]:
    """Return all leads stored in the database."""
    return db.query(models.Lead).all()
