"""
Firebase JWT authentication middleware.
Provides a decorator to protect Flask routes with Firebase token verification.
"""

import logging
from functools import wraps

from flask import request, g, jsonify

from app.services.auth_service import verify_firebase_token, get_user_only

logger = logging.getLogger(__name__)


def firebase_auth_required(f):
    """
    Decorator that verifies the Firebase JWT from the Authorization header.
    On success, sets g.current_user to the local User ORM instance.
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
            return jsonify({
                'success': False,
                'error': 'Missing or malformed Authorization header. Expected: Bearer <token>',
                'data': None
            }), 401

        try:
            decoded_token = verify_firebase_token(id_token)
        except Exception as exc:
            logger.warning('Token verification failed in middleware: %s', exc)
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

        # Get the local user record (Strict lookup ONLY - no auto-creation!)
        try:
            user = get_user_only(firebase_uid, email=email)
            g.current_user = user
        except Exception as exc:
            logger.error('User lookup failed: %s', exc)
            return jsonify({
                'success': False,
                'error': 'Authentication lookup failed.',
                'data': None
            }), 500
        
        if not g.current_user:
            return jsonify({
                'success': False,
                'error': 'Unauthorized: Valid backend user not found.',
                'data': None
            }), 403

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
