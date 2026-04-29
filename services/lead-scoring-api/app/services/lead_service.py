from sqlalchemy.orm import Session

from .. import models, schemas, ml_model


def create_lead(db: Session, lead_data: schemas.LeadCreate) -> models.Lead:
    """Create a new lead record and calculate its score.

    Parameters
    ----------
    db : Session
        SQLAlchemy session instance.
    lead_data : schemas.LeadCreate
        Validated payload representing lead attributes.

    Returns
    -------
    models.Lead
        Newly created database object with score filled in.
    """

    score = ml_model.predict_lead_score(lead_data)
    db_lead = models.Lead(
        age=lead_data.age,
        income=lead_data.income,
        browsing_frequency=lead_data.browsing_frequency,
        time_spent=lead_data.time_spent,
        location_score=lead_data.location_score,
        lead_score=score,
    )

    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)

    return db_lead
