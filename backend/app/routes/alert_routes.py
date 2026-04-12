import logging
from flask import Blueprint, jsonify
from app.controllers.alert_controller import get_alerts
from app.middleware.auth_middleware import firebase_auth_required

logger = logging.getLogger(__name__)

alert_bp = Blueprint('alerts', __name__)

@alert_bp.route('', methods=['GET'])
@firebase_auth_required
def fetch_alerts():
    try:
        alerts = get_alerts()
        return jsonify({'success': True, 'data': alerts}), 200
    except Exception as e:
        logger.error(f'Alerts fetch error: {e}')
        return jsonify({'success': False, 'message': 'Internal Server Error'}), 500
