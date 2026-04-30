"""
Firebase JWT authentication middleware.
Provides a decorator to protect Flask routes with Firebase token verification.
Self-healing: recovers from DB session corruption and auto-creates missing users.
"""

import logging
from functools import wraps

from flask import request, g, jsonify
from sqlalchemy.exc import SQLAlchemyError

from app.services.auth_service import verify_firebase_token, get_user_only, get_or_create_user

logger = logging.getLogger(__name__)


def firebase_auth_required(f):
    """
    Decorator that verifies the Firebase JWT from the Authorization header.
    On success, sets g.current_user to the local User ORM instance.

    Self-healing behaviour:
    - Resets DB session before lookup to recover from PendingRollbackError
    - Falls back to get_or_create_user() if strict lookup fails
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')

        id_token = None
        if auth_header.startswith('Bearer '):
            id_token = auth_header.split('Bearer ')[1].strip()

        if not id_token and request.path.startswith('/api/stream'):
            id_token = request.args.get('token', '').strip()

        if not id_token:
            logger.warning('Auth: Missing token for %s %s', request.method, request.path)
            return jsonify({
                'success': False,
                'error': 'Missing or malformed Authorization header. Expected: Bearer <token>',
                'data': None
            }), 401

        try:
            decoded_token = verify_firebase_token(id_token)
        except Exception as exc:
            logger.warning('Auth: Token verification failed for %s: %s', request.path, exc)
            return jsonify({
                'success': False,
                'error': f'Invalid or expired authentication token: {str(exc)}',
                'data': None
            }), 401

        # Extract user info from the decoded Firebase token
        firebase_uid = decoded_token.get('uid')
        email = decoded_token.get('email', '')

        if not firebase_uid:
            return jsonify({
                'success': False,
                'error': 'Token does not contain a valid user ID.',
                'data': None
            }), 401

        # ── Self-healing DB session recovery ──
        # Reset any poisoned session state from prior failed transactions
        # This prevents PendingRollbackError from cascading to all requests
        from app import db
        try:
            db.session.rollback()
        except Exception:
            pass  # Safe to ignore — session might already be clean

        # ── User lookup with self-healing fallback ──
        user = None
        recovery_triggered = False

        # Step 1: Try strict lookup (fast path)
        try:
            user = get_user_only(firebase_uid, email=email)
        except SQLAlchemyError as db_exc:
            logger.error('Auth: DB error during user lookup (UID=%s): %s', firebase_uid, db_exc)
            # Recovery: rollback and retry
            try:
                db.session.rollback()
                user = get_user_only(firebase_uid, email=email)
            except Exception:
                user = None
            recovery_triggered = True
        except Exception as exc:
            logger.error('Auth: Unexpected error during user lookup (UID=%s): %s', firebase_uid, exc)
            user = None

        # Step 2: Self-healing — if user not found, auto-create via UPSERT
        if not user:
            logger.info(
                'Auth: User not found via strict lookup (UID=%s, email=%s). '
                'Attempting self-healing auto-creation.',
                firebase_uid, email
            )
            try:
                user, _ = get_or_create_user(
                    firebase_uid=firebase_uid,
                    email=email,
                )
                recovery_triggered = True
            except Exception as create_exc:
                logger.error('Auth: Self-healing user creation failed (UID=%s): %s', firebase_uid, create_exc)
                return jsonify({
                    'success': False,
                    'error': 'Authentication failed: unable to resolve user account. Please try logging out and back in.',
                    'data': None
                }), 500

        if not user:
            return jsonify({
                'success': False,
                'error': 'Unauthorized: Valid backend user not found. Please sign in again.',
                'data': None
            }), 403

        g.current_user = user

        if recovery_triggered:
            logger.info(
                'Auth: Self-healing recovery succeeded for UID=%s (user_id=%s, role=%s)',
                firebase_uid, user.id, user.role
            )

        return f(*args, **kwargs)

    return decorated_function


def role_required(*roles):
    """
    Decorator enforcing role-based access control.
    Usage: @role_required('canteen', 'admin')
    """
    allowed_roles = [r.lower() for r in roles]

    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            current = getattr(g, 'current_user', None)
            if not current:
                return jsonify({
                    'success': False,
                    'error': 'Unauthorized: user not found in request context.',
                    'data': None
                }), 403

            user_role = (current.role or 'canteen').lower()
            if user_role not in allowed_roles:
                return jsonify({
                    'success': False,
                    'error': 'Forbidden: insufficient role permissions.',
                    'data': None
                }), 403

            return f(*args, **kwargs)
        return wrapped
    return decorator
