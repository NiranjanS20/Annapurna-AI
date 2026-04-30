import logging
from flask import Blueprint, jsonify
from app.controllers.analytics_controller import get_dashboard_data
from app.middleware.auth_middleware import firebase_auth_required

logger = logging.getLogger(__name__)

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('', methods=['GET'])
@firebase_auth_required
def dashboard():
    try:
        data = get_dashboard_data()
        logger.info("Analytics API response: isEmpty=%s, keys=%s", data.get('isEmpty'), list(data.keys()))
        print("Analytics API response: isEmpty=%s, keys=%s" % (data.get('isEmpty'), list(data.keys())))
        return jsonify({'success': True, 'data': data}), 200
    except Exception as e:
        logger.error(f'Dashboard fetch error: {e}')
        print("ERROR in analytics endpoint:", str(e))
        return jsonify({'success': False, 'error': 'Failed to load dashboard data. Please try again.', 'data': None}), 500
