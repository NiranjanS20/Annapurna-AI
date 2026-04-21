"""
Firebase authentication service.
Verifies Firebase ID tokens and manages the local User record.
Supports both JSON file and environment-variable-based credentials.
"""

import json
import logging
import os
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from sqlalchemy.dialects.postgresql import insert

from app import db
from app.utils.db_transaction import execute_transaction
from app.models.user import User

logger = logging.getLogger(__name__)

_firebase_initialised = False


def init_firebase(cred_path=None, cred_json=None):
    """
    Initialise the Firebase Admin SDK (idempotent).
    """
    global _firebase_initialised
    if _firebase_initialised:
        return

    cred = None

    if cred_json:
        try:
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
        except (json.JSONDecodeError, ValueError) as exc:
            logger.error('Failed to parse FIREBASE_CREDENTIALS_JSON: %s', exc)

    if cred is None and cred_path and os.path.exists(cred_path):
        try:
            cred = credentials.Certificate(cred_path)
        except Exception as exc:
            logger.error('Failed to load Firebase credentials from %s: %s', cred_path, exc)

    if cred is None:
        logger.warning('No valid Firebase credentials found. Auth will use mock mode.')
        _firebase_initialised = False
        return

    try:
        firebase_admin.initialize_app(cred)
        _firebase_initialised = True
        logger.info('Firebase Admin SDK initialised.')
    except ValueError:
        _firebase_initialised = True
    except Exception as exc:
        logger.error('Failed to initialise Firebase Admin SDK: %s', exc)
        raise


def is_firebase_ready():
    return _firebase_initialised


def verify_firebase_token(id_token):
    if not _firebase_initialised:
        raise RuntimeError('Firebase Admin SDK is not initialised.')

    try:
        import time
        logger.info(f"Verifying token at server time: {time.time()}")
        decoded = firebase_auth.verify_id_token(id_token, clock_skew_seconds=10)
        return decoded
    except Exception as exc:
        logger.error('Firebase token verification error: %s', exc)
        raise


def get_user_only(firebase_uid, email=None):
    """
    Strict lookup. Does not create the user.
    Used by middleware to avoid race condition insertions.
    """
    user = User.query.filter_by(firebase_uid=firebase_uid).first()
    if not user and email:
        user = User.query.filter_by(email=email).first()
    return user


def get_or_create_user(firebase_uid, email=None, full_name=None,
                       business_name=None, business_type=None, location=None):
    """
    UPSERT strategy using PostgreSQL 'ON CONFLICT DO UPDATE'.
    Eliminates race conditions where two parallel requests attempt to create the user.
    """
    stmt = insert(User).values(
        firebase_uid=firebase_uid,
        email=email,
        full_name=full_name,
        business_name=business_name,
        business_type=business_type,
        location=location,
        role='admin'
    )

    update_dict = {}
    if email:
        update_dict['email'] = db.func.coalesce(stmt.excluded.email, User.email)
    if full_name:
        update_dict['full_name'] = db.func.coalesce(stmt.excluded.full_name, User.full_name)
    if business_name:
        update_dict['business_name'] = db.func.coalesce(stmt.excluded.business_name, User.business_name)
    if business_type:
        update_dict['business_type'] = db.func.coalesce(stmt.excluded.business_type, User.business_type)
    if location:
        update_dict['location'] = db.func.coalesce(stmt.excluded.location, User.location)

    if update_dict:
        stmt = stmt.on_conflict_do_update(
            index_elements=['email'],
            set_=update_dict
        )
    else:
        stmt = stmt.on_conflict_do_nothing(
            index_elements=['email']
        )

    try:
        db.session.execute(stmt)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error("UPSERT Transaction Error: %s", e)
        raise e

    # Retrieve the user object (either just created or explicitly updated)
    user = User.query.filter_by(firebase_uid=firebase_uid).first()
    if not user and email:
         user = User.query.filter_by(email=email).first()

    return user, False


def check_user_exists(email):
    """
    Check whether a user with the given email already exists in the database.
    Returns True if found, False otherwise.
    """
    if not email:
        return False
    user = User.query.filter_by(email=email).first()
    return user is not None
