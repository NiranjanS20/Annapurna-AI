import logging
from app import db

logger = logging.getLogger(__name__)

def execute_transaction(*models):
    """
    Universal insert/update validation layer.
    Takes one or multiple SQLAlchemy model instances, adds them to session,
    and commits exactly once. Handles rollback on failure automatically to
    prevent database session corruption (PendingRollbackError).
    
    Returns True on success, False on failure.
    Raise exceptions after rollback if callers need to intercept it.
    """
    try:
        if models:
            for model in models:
                db.session.add(model)
        db.session.commit()
        logger.info("Transaction Execute: Committed DB session successfully.")
        return True
    except Exception as e:
        logger.error("Transaction Error: Rolled back database session -> %s", e)
        db.session.rollback()
        raise e  # Reraises to caller (e.g. Flask route or controller) to handle 500 response
