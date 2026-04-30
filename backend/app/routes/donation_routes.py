import logging
from flask import Blueprint, request, jsonify
from app.controllers.donation_controller import get_donations, create_donation, get_donation_for_user
from app.controllers.donation_listing_controller import (
    get_canteen_listings,
    get_listing_for_canteen,
    create_listing,
    finalize_listing,
    schedule_pickup,
    complete_listing,
    convert_donation_to_listing,
)
from app.middleware.auth_middleware import firebase_auth_required, role_required
from flask import current_app

logger = logging.getLogger(__name__)

donation_bp = Blueprint('donations', __name__)

def _donation_v2_enabled():
    return current_app.config.get('FEATURE_DONATION_V2', True)

@donation_bp.route('', methods=['GET'])
@firebase_auth_required
@role_required('canteen', 'admin')
def fetch_donations():
    try:
        donations = get_donations()
        return jsonify({'success': True, 'data': donations}), 200
    except Exception as e:
        logger.error(f'Donations fetch error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500

@donation_bp.route('', methods=['POST'])
@firebase_auth_required
@role_required('canteen', 'admin')
def create():
    try:
        data = request.json
        donation = create_donation(data)
        return jsonify({'success': True, 'data': donation}), 201
    except Exception as e:
        logger.error(f'Donation creation error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500

@donation_bp.route('/<int:donation_id>/mark', methods=['PUT'])
@firebase_auth_required
@role_required('canteen', 'admin')
def mark(donation_id):
    try:
        from app.controllers.donation_controller import mark_donation
        donation = mark_donation(donation_id)
        return jsonify({'success': True, 'data': donation}), 200
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e), 'data': None}), 404
    except Exception as e:
        logger.error(f'Donation marking error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500


@donation_bp.route('/<int:donation_id>/convert', methods=['POST'])
@firebase_auth_required
@role_required('canteen', 'admin')
def convert(donation_id):
    if not _donation_v2_enabled():
        return jsonify({'success': False, 'error': 'Donation v2 is disabled.', 'data': None}), 404
    try:
        donation = get_donation_for_user(donation_id)
        if not donation:
            return jsonify({'success': False, 'error': 'Donation not found', 'data': None}), 404
        data = request.json or {}
        listing = convert_donation_to_listing(donation, data)
        return jsonify({'success': True, 'data': listing}), 201
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e), 'data': None}), 400
    except Exception as e:
        logger.error(f'Donation conversion error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500


@donation_bp.route('/listings', methods=['GET'])
@firebase_auth_required
@role_required('canteen', 'admin')
def fetch_listings():
    if not _donation_v2_enabled():
        return jsonify({'success': False, 'error': 'Donation v2 is disabled.', 'data': None}), 404
    try:
        listings = get_canteen_listings()
        return jsonify({'success': True, 'data': listings}), 200
    except Exception as e:
        logger.error(f'Donation listings fetch error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500


@donation_bp.route('/listings', methods=['POST'])
@firebase_auth_required
@role_required('canteen', 'admin')
def create_listing_route():
    if not _donation_v2_enabled():
        return jsonify({'success': False, 'error': 'Donation v2 is disabled.', 'data': None}), 404
    try:
        data = request.json or {}
        listing = create_listing(data)
        return jsonify({'success': True, 'data': listing}), 201
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e), 'data': None}), 400
    except Exception as e:
        logger.error(f'Donation listing creation error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500


@donation_bp.route('/listings/<string:listing_id>', methods=['GET'])
@firebase_auth_required
@role_required('canteen', 'admin')
def get_listing_route(listing_id):
    if not _donation_v2_enabled():
        return jsonify({'success': False, 'error': 'Donation v2 is disabled.', 'data': None}), 404
    try:
        listing = get_listing_for_canteen(listing_id)
        if not listing:
            return jsonify({'success': False, 'error': 'Donation listing not found', 'data': None}), 404
        return jsonify({'success': True, 'data': listing.to_dict()}), 200
    except Exception as e:
        logger.error(f'Donation listing fetch error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500


@donation_bp.route('/listings/<string:listing_id>/finalize', methods=['POST'])
@firebase_auth_required
@role_required('canteen', 'admin')
def finalize_listing_route(listing_id):
    if not _donation_v2_enabled():
        return jsonify({'success': False, 'error': 'Donation v2 is disabled.', 'data': None}), 404
    try:
        listing = get_listing_for_canteen(listing_id)
        if not listing:
            return jsonify({'success': False, 'error': 'Donation listing not found', 'data': None}), 404
        data = request.json or {}
        updated = finalize_listing(listing, data)
        return jsonify({'success': True, 'data': updated}), 200
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e), 'data': None}), 400
    except Exception as e:
        logger.error(f'Donation listing finalize error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500


@donation_bp.route('/listings/<string:listing_id>/schedule-pickup', methods=['POST'])
@firebase_auth_required
@role_required('canteen', 'admin')
def schedule_pickup_route(listing_id):
    if not _donation_v2_enabled():
        return jsonify({'success': False, 'error': 'Donation v2 is disabled.', 'data': None}), 404
    try:
        listing = get_listing_for_canteen(listing_id)
        if not listing:
            return jsonify({'success': False, 'error': 'Donation listing not found', 'data': None}), 404
        data = request.json or {}
        pickup_eta = data.get('pickup_eta')
        if not pickup_eta:
            return jsonify({'success': False, 'error': 'pickup_eta is required', 'data': None}), 400
        from app.services.donation_service import parse_datetime
        updated = schedule_pickup(listing, parse_datetime(pickup_eta))
        return jsonify({'success': True, 'data': updated}), 200
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e), 'data': None}), 400
    except Exception as e:
        logger.error(f'Donation listing schedule error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500


@donation_bp.route('/listings/<string:listing_id>/complete', methods=['POST'])
@firebase_auth_required
@role_required('canteen', 'admin')
def complete_listing_route(listing_id):
    if not _donation_v2_enabled():
        return jsonify({'success': False, 'error': 'Donation v2 is disabled.', 'data': None}), 404
    try:
        listing = get_listing_for_canteen(listing_id)
        if not listing:
            return jsonify({'success': False, 'error': 'Donation listing not found', 'data': None}), 404
        updated = complete_listing(listing)
        return jsonify({'success': True, 'data': updated}), 200
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e), 'data': None}), 400
    except Exception as e:
        logger.error(f'Donation listing completion error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500

