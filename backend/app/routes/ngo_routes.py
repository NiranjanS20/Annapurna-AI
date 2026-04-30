import logging
from flask import Blueprint, request, jsonify, current_app

from app.middleware.auth_middleware import firebase_auth_required, role_required
from app.controllers.ngo_controller import (
    get_ngo_profile,
    save_ngo_profile,
    get_nearby_donations,
    accept_donation,
    get_accepted_donations,
    list_notifications,
    mark_notification_read,
)

logger = logging.getLogger(__name__)

ngo_bp = Blueprint('ngo', __name__)


def _ngo_enabled():
    return current_app.config.get('FEATURE_NGO', True)


@ngo_bp.route('/profile', methods=['GET'])
@firebase_auth_required
def fetch_profile():
    if not _ngo_enabled():
        return jsonify({'success': False, 'error': 'NGO features are disabled.', 'data': None}), 404
    try:
        profile = get_ngo_profile()
        return jsonify({'success': True, 'data': profile}), 200
    except Exception as e:
        logger.error(f'NGO profile fetch error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500


@ngo_bp.route('/profile', methods=['POST'])
@firebase_auth_required
def upsert_profile():
    if not _ngo_enabled():
        return jsonify({'success': False, 'error': 'NGO features are disabled.', 'data': None}), 404
    try:
        data = request.json or {}
        profile = save_ngo_profile(data)
        return jsonify({'success': True, 'data': profile}), 201
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e), 'data': None}), 400
    except Exception as e:
        logger.error(f'NGO profile save error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500


@ngo_bp.route('/donations/nearby', methods=['GET'])
@firebase_auth_required
@role_required('ngo', 'admin')
def nearby_donations():
    if not _ngo_enabled():
        return jsonify({'success': False, 'error': 'NGO features are disabled.', 'data': None}), 404
    try:
        lat = request.args.get('lat', None)
        lng = request.args.get('lng', None)
        radius = request.args.get('radius_km', None)

        lat_val = float(lat) if lat is not None else None
        lng_val = float(lng) if lng is not None else None
        radius_val = float(radius) if radius is not None else None

        listings = get_nearby_donations(lat=lat_val, lng=lng_val, radius_km=radius_val)
        return jsonify({'success': True, 'data': listings}), 200
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e), 'data': None}), 400
    except Exception as e:
        logger.error(f'Nearby donations error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500


@ngo_bp.route('/donations/<string:listing_id>/accept', methods=['POST'])
@firebase_auth_required
@role_required('ngo', 'admin')
def accept_listing(listing_id):
    if not _ngo_enabled():
        return jsonify({'success': False, 'error': 'NGO features are disabled.', 'data': None}), 404
    try:
        idempotency_key = request.headers.get('Idempotency-Key') or request.headers.get('X-Idempotency-Key')
        acceptance = accept_donation(listing_id, idempotency_key=idempotency_key)
        return jsonify({'success': True, 'data': acceptance}), 200
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e), 'data': None}), 400
    except Exception as e:
        logger.error(f'Donation acceptance error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500


@ngo_bp.route('/donations/accepted', methods=['GET'])
@firebase_auth_required
@role_required('ngo', 'admin')
def accepted_donations():
    if not _ngo_enabled():
        return jsonify({'success': False, 'error': 'NGO features are disabled.', 'data': None}), 404
    try:
        data = get_accepted_donations()
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        logger.error(f'Accepted donations error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500


@ngo_bp.route('/notifications', methods=['GET'])
@firebase_auth_required
@role_required('ngo', 'admin')
def ngo_notifications():
    if not _ngo_enabled():
        return jsonify({'success': False, 'error': 'NGO features are disabled.', 'data': None}), 404
    try:
        data = list_notifications()
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        logger.error(f'NGO notifications error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500


@ngo_bp.route('/notifications/<int:notification_id>/read', methods=['POST'])
@firebase_auth_required
@role_required('ngo', 'admin')
def mark_notification(notification_id):
    if not _ngo_enabled():
        return jsonify({'success': False, 'error': 'NGO features are disabled.', 'data': None}), 404
    try:
        data = mark_notification_read(notification_id)
        return jsonify({'success': True, 'data': data}), 200
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e), 'data': None}), 404
    except Exception as e:
        logger.error(f'NGO notification mark error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500
