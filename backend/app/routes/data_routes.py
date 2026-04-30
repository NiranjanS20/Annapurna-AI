import logging
from flask import Blueprint, request, jsonify
from app.controllers.data_controller import create_food_data, get_menu_items, add_menu_item
from app.controllers.csv_controller import process_csv_upload
from app.middleware.auth_middleware import firebase_auth_required

logger = logging.getLogger(__name__)

data_bp = Blueprint('data', __name__)

@data_bp.route('', methods=['POST'])
@firebase_auth_required
def add_data():
    try:
        data = request.json
        logger.info("POST /api/data — Incoming body: %s", data)
        print("POST /api/data — Incoming body:", data)
        res = create_food_data(data)
        return jsonify({'success': True, 'message': 'Data logged successfully', 'data': res}), 201
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e), 'data': None}), 400
    except Exception as e:
        logger.error(f'Data creation error: {e}')
        print("DB ERROR:", str(e))
        return jsonify({'success': False, 'error': str(e), 'data': None}), 500

@data_bp.route('/upload-csv', methods=['POST'])
@firebase_auth_required
def upload_csv():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file part', 'data': None}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No selected file', 'data': None}), 400
            
        if not file.filename.endswith('.csv'):
            return jsonify({'success': False, 'error': 'Please upload a valid .csv file', 'data': None}), 400
            
        result = process_csv_upload(file)
        
        message = f"{result['rows_inserted']} records imported successfully."
        if result.get('skipped_duplicates', 0) > 0:
            message += f" ({result['skipped_duplicates']} duplicates skipped)."
        if result.get('skipped_invalid', 0) > 0:
            message += f" ({result['skipped_invalid']} invalid rows skipped)."
            
        return jsonify({
            'success': True, 
            'rows_inserted': result['rows_inserted'],
            'skipped_duplicates': result.get('skipped_duplicates', 0),
            'skipped_invalid': result.get('skipped_invalid', 0),
            'duration_ms': result.get('duration_ms'),
            'parsing_errors': result.get('parsing_errors', []),
            'message': message,
            'data': None
        }), 200
        
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e), 'data': None}), 400
    except Exception as e:
        logger.error(f'CSV Upload error: {e}')
        return jsonify({'success': False, 'error': str(e), 'data': None}), 500


@data_bp.route('/menu-items', methods=['GET'])
@firebase_auth_required
def fetch_menu_items():
    try:
        items = get_menu_items()
        return jsonify({'success': True, 'data': items}), 200
    except Exception as e:
        logger.error(f'Menu item fetch error: {e}')
        return jsonify({'success': False, 'error': 'Internal Server Error', 'data': None}), 500

@data_bp.route('/menu-items/add', methods=['POST'])
@firebase_auth_required
def create_menu_item():
    try:
        data = request.json
        name = data.get('name')
        category = data.get('category', 'Custom')
        if not name:
            return jsonify({'success': False, 'error': 'Menu item name is required.', 'data': None}), 400
        
        item = add_menu_item(name, category)
        return jsonify({'success': True, 'data': item, 'error': None}), 201
    except Exception as e:
        logger.error(f'Menu item creation error: {e}')
        return jsonify({'success': False, 'error': str(e), 'data': None}), 500
