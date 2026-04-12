"""
Flask Application Factory.
Creates and configures the Flask app with all extensions, blueprints, and services.
"""

import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize extensions (created here, bound to app in create_app)
db = SQLAlchemy()
migrate = Migrate()


def create_app(config_name=None):
    """Application factory — creates and returns a configured Flask app."""

    app = Flask(__name__)

    # ------------------------------------------------------------------
    # Configuration
    # ------------------------------------------------------------------
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    from app.utils.config import config_by_name
    app.config.from_object(config_by_name.get(config_name, config_by_name['development']))

    # Required DB config from environment (.env / Railway)
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        if database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url

    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # ------------------------------------------------------------------
    # Logging
    # ------------------------------------------------------------------
    logging.basicConfig(
        level=logging.INFO if not app.debug else logging.DEBUG,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    )
    logger = logging.getLogger(__name__)
    logger.info('Starting app in %s mode', config_name)

    # ------------------------------------------------------------------
    # CORS
    # ------------------------------------------------------------------
    CORS(app, resources={r"/api/*": {"origins": app.config.get('CORS_ORIGINS', '*')}})

    # ------------------------------------------------------------------
    # Extensions
    # ------------------------------------------------------------------
    db.init_app(app)
    migrate.init_app(app, db)

    # ------------------------------------------------------------------
    # Import models so SQLAlchemy metadata is registered for migrations
    # ------------------------------------------------------------------
    from app import models  # noqa: F401

    # ------------------------------------------------------------------
    # Auto-create tables and seed on first run
    # ------------------------------------------------------------------
    with app.app_context():
        try:
            db.create_all()
            logger.info('Database tables ensured.')
            
            # --- Safe SQLite Auto-Migration Patch for user_id schema ---
            from sqlalchemy import text
            tables = ['food_data', 'menu_items', 'predictions', 'alerts', 'donations']
            for t in tables:
                try:
                    db.session.execute(text(f"ALTER TABLE {t} ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                    db.session.commit()
                except Exception:
                    db.session.rollback() # Ignores gracefully if column already exists
                    
            from app.utils.db import seed_menu_items
            seed_menu_items()
        except Exception as exc:
            logger.warning('Auto-init DB warning (non-fatal): %s', exc)

    # ------------------------------------------------------------------
    # Firebase Admin SDK (supports env var and file-based credentials)
    # ------------------------------------------------------------------
    try:
        from app.services.auth_service import init_firebase
        cred_json = app.config.get('FIREBASE_CREDENTIALS_JSON', '')
        cred_path = app.config.get('FIREBASE_CREDENTIALS_PATH', '')
        init_firebase(cred_path=cred_path, cred_json=cred_json)
    except Exception as exc:
        logger.error('Firebase init error: %s', exc)

    # ------------------------------------------------------------------
    # ML Model (loaded once at startup — singleton)
    # ------------------------------------------------------------------
    try:
        from app.services.ml_service import init_ml
        ml_path = app.config.get('ML_MODEL_PATH', '')
        init_ml(ml_path)
    except Exception as exc:
        logger.warning('ML init warning (non-fatal): %s', exc)

    # ------------------------------------------------------------------
    # Register Blueprints
    # ------------------------------------------------------------------
    from app.routes.auth_routes import auth_bp
    from app.routes.data_routes import data_bp
    from app.routes.prediction_routes import prediction_bp
    from app.routes.analytics_routes import analytics_bp
    from app.routes.donation_routes import donation_bp
    from app.routes.alert_routes import alert_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(data_bp, url_prefix='/api/data')
    app.register_blueprint(prediction_bp, url_prefix='/api/predictions')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(donation_bp, url_prefix='/api/donations')
    app.register_blueprint(alert_bp, url_prefix='/api/alerts')

    # ------------------------------------------------------------------
    # Route aliases (match what the frontend actually calls)
    # ------------------------------------------------------------------
    # Frontend calls GET /api/predict?itemId=...
    @app.route('/api/predict', methods=['GET'])
    def predict_alias():
        from app.routes.prediction_routes import predict
        return predict()

    # Frontend calls GET /api/dashboard
    @app.route('/api/dashboard', methods=['GET'])
    def dashboard_alias():
        from app.routes.analytics_routes import dashboard
        return dashboard()

    # Frontend calls POST /api/donate
    @app.route('/api/donate', methods=['POST'])
    def donate_alias():
        from app.routes.donation_routes import create
        return create()

    # ------------------------------------------------------------------
    # Health check endpoint
    # ------------------------------------------------------------------
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({'status': 'ok', 'message': 'Annapurna AI backend is running.'}), 200

    # ------------------------------------------------------------------
    # Request Auditing
    # ------------------------------------------------------------------
    @app.before_request
    def log_request_info():
        from flask import request
        if request.path.startswith('/api/'):
            logger.info('Incoming API Request: %s %s', request.method, request.path)

    # ------------------------------------------------------------------
    # Error handlers
    # ------------------------------------------------------------------
    @app.errorhandler(Exception)
    def handle_global_error(e):
        logger.error(f'Unhandled Exception: {e}')
        # DO NOT expose internal Python error details fully to client in prod, 
        # but for this specific request, the user wanted raw error string.
        return jsonify({'success': False, 'error': str(e), 'data': None}), 500

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'success': False, 'error': 'Resource not found.', 'data': None}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'success': False, 'error': 'Internal server error.', 'data': None}), 500

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'success': False, 'error': 'Method not allowed.', 'data': None}), 405

    return app
