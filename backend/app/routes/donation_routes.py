import logging
from flask import Blueprint, request, jsonify
from app.controllers.donation_controller import get_donations, create_donation
from app.middleware.auth_middleware import firebase_auth_required

logger = logging.getLogger(__name__)

donation_bp = Blueprint('donations', __name__)

@donation_bp.route('', methods=['GET'])
@firebase_auth_required
def fetch_donations():
    try:
        donations = get_donations()
        return jsonify({'success': True, 'data': donations}), 200
    except Exception as e:
        logger.error(f'Donations fetch error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500

@donation_bp.route('', methods=['POST'])
@firebase_auth_required
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

