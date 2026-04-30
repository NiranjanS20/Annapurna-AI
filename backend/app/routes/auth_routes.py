"""
Authentication routes.
Handles Firebase token verification, user sync, and user profile retrieval.
"""

import logging
from flask import Blueprint, request, g, jsonify

from app.middleware.auth_middleware import firebase_auth_required
from app.services.auth_service import verify_firebase_token, get_or_create_user, check_user_exists

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth_bp', __name__)


@auth_bp.route('/verify', methods=['POST'])
def verify_token():
    """
    POST /api/auth/verify
    Body: { "idToken": "<firebase_jwt>", "profile": { ... } }
    """
    data = request.get_json(silent=True) or {}
    profile_data = data.get('profile', {})

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.error("Missing or malformed Authorization header in /verify")
        return jsonify({'success': False, 'error': 'Missing or invalid Authorization header. Expected: Bearer <token>', 'data': None}), 400

    id_token = auth_header.split(" ")[1].strip()
    if not id_token:
        return jsonify({'success': False, 'error': 'idToken is required.', 'data': None}), 400

    logger.info("Received Token for verification: %s...", id_token[:10])

    try:
        decoded = verify_firebase_token(id_token)
        logger.info("Token verified successfully for UID: %s", decoded.get('uid'))
    except Exception as e:
        logger.error("Firebase token verification failed in /verify: %s", str(e))
        return jsonify({'success': False, 'error': 'Invalid or expired token: ' + str(e), 'data': None}), 401

    firebase_uid = decoded.get('uid')
    email = decoded.get('email', '')

    user, created = get_or_create_user(
        firebase_uid=firebase_uid,
        email=email,
        full_name=profile_data.get('full_name'),
        business_name=profile_data.get('business_name'),
        business_type=profile_data.get('business_type'),
        location=profile_data.get('location')
    )

    return jsonify({
        'success': True,
        'message': 'User verified successfully.',
        'error': None,
        'data': {
            'user': user.to_dict(),
            'isNewUser': created,
        },
    }), 200


@auth_bp.route('/sync-user', methods=['POST'])
def sync_user():
    """
    POST /api/auth/sync-user
    Body: { "idToken": "<firebase_jwt>", "profile": { ... } }

    Called immediately after Firebase login succeeds.
    - If user exists → return user
    - If not → create user
    Returns: { success: true, user: {...}, isNewUser: bool }
    """
    data = request.get_json(silent=True) or {}
    profile_data = data.get('profile', {})

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.error("Missing or malformed Authorization header in /sync-user")
        return jsonify({'success': False, 'error': 'Missing or invalid Authorization header. Expected: Bearer <token>', 'data': None}), 400

    id_token = auth_header.split(" ")[1].strip()
    if not id_token:
        return jsonify({'success': False, 'error': 'idToken is required.', 'data': None}), 400

    logger.info("Received Token for sync: %s...", id_token[:10])

    try:
        decoded = verify_firebase_token(id_token)
        logger.info("Token verified successfully for UID: %s", decoded.get('uid'))
    except Exception as e:
        logger.error("Firebase token verification failed in /sync-user: %s", str(e))
        return jsonify({'success': False, 'error': 'Invalid or expired token: ' + str(e), 'data': None}), 401

    firebase_uid = decoded.get('uid')
    email = decoded.get('email', '')

    if not firebase_uid:
        return jsonify({'success': False, 'error': 'Token does not contain a valid user ID.', 'data': None}), 401

    is_empty = not any(profile_data.values())
    logger.info("Incoming /sync-user Request | UID: %s | IsEmptyProfile: %s", firebase_uid, is_empty)

    try:
        user, created = get_or_create_user(
            firebase_uid=firebase_uid,
            email=email,
            full_name=profile_data.get('full_name'),
            business_name=profile_data.get('business_name'),
            business_type=profile_data.get('business_type'),
            location=profile_data.get('location')
        )
    except Exception as exc:
        return jsonify({'success': False, 'error': 'User sync failed: ' + str(exc), 'data': None}), 500

    return jsonify({
        'success': True,
        'user': user.to_dict(),
        'isNewUser': created,
    }), 200


@auth_bp.route('/check-user', methods=['GET'])
def check_user():
    """
    GET /api/auth/check-user?email=<email>

    Checks whether a user with the given email exists in the backend.
    Used by Google login flow to decide login vs. signup.
    Returns: { success: true, exists: bool }
    """
    email = request.args.get('email', '').strip()

    if not email:
        return jsonify({'success': False, 'error': 'email query parameter is required.', 'data': None}), 400

    exists = check_user_exists(email)

    return jsonify({
        'success': True,
        'exists': exists,
    }), 200


@auth_bp.route('/me', methods=['GET'])
@firebase_auth_required
def get_current_user():
    return jsonify({
        'success': True,
        'data': g.current_user.to_dict(),
    }), 200
