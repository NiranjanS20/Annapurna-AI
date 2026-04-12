import logging
from flask import Blueprint, request, jsonify
from app.controllers.prediction_controller import generate_prediction, get_food_items
from app.middleware.auth_middleware import firebase_auth_required
from datetime import datetime

logger = logging.getLogger(__name__)

prediction_bp = Blueprint('predictions', __name__)

@prediction_bp.route('/items', methods=['GET'])
@firebase_auth_required
def fetch_food_items():
    """GET /api/predictions/items — Returns distinct item names from food_data."""
    try:
        items = get_food_items()
        logger.info("Fetched %d food items for prediction dropdown", len(items))
        print("Prediction items fetched:", items)
        return jsonify({'success': True, 'data': items}), 200
    except Exception as e:
        logger.error(f'Item fetch error: {e}')
        print("ERROR fetching items:", str(e))
        return jsonify({'success': False, 'error': str(e), 'data': []}), 500

@prediction_bp.route('', methods=['GET'])
@firebase_auth_required
def predict():
    try:
        item_name = request.args.get('item_name')
        day_of_week = request.args.get('day_of_week')
        target_date = request.args.get('date', None)

        logger.info("Prediction request: item=%s, day=%s, date=%s", item_name, day_of_week, target_date)
        print("Prediction request: item=%s, day=%s, date=%s" % (item_name, day_of_week, target_date))

        if not item_name:
            return jsonify({'success': False, 'message': 'item_name is required'}), 400

        res = generate_prediction(item_name, day_of_week=day_of_week, target_date_str=target_date)
        return jsonify({'success': True, 'data': res}), 200
    except Exception as e:
        logger.error(f'Prediction error: {e}')
        print("ERROR in prediction:", str(e))
        return jsonify({'success': False, 'message': 'Internal Server Error', 'error': str(e)}), 500
