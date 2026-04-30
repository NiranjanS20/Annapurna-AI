"""
Centralized configuration for the Flask application.
Loads settings from environment variables with sensible defaults.
"""

import os
import json
from pathlib import Path

# Base directory of the backend package
BASE_DIR = Path(__file__).resolve().parent.parent.parent


def _resolve_model_path():
    """
    Resolve the ML model path robustly for both local and Railway deployments.
    Priority:
      1. ML_MODEL_PATH env var (explicit)
      2. <project_root>/ml_models/models/demand_model.pkl  (standard local layout)
      3. <backend_dir>/../ml_models/models/demand_model.pkl (relative fallback)
    """
    env_path = os.environ.get('ML_MODEL_PATH', '')
    if env_path and os.path.exists(env_path):
        return env_path

    # Standard project layout: backend/ is sibling to ml_models/
    project_root = BASE_DIR.parent
    candidates = [
        project_root / 'ml_models' / 'models' / 'demand_model.pkl',
        project_root / 'ml_models' / 'demand_model.pkl',  # legacy location
        BASE_DIR / '..' / 'ml_models' / 'models' / 'demand_model.pkl',
        BASE_DIR / '..' / 'ml_models' / 'demand_model.pkl',
    ]

    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved.exists():
            return str(resolved)

    # Return the preferred path even if it doesn't exist yet
    return str((project_root / 'ml_models' / 'models' / 'demand_model.pkl').resolve())


class Config:
    """Base configuration shared across all environments."""

    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

    # Database — Railway sets DATABASE_URL automatically for PostgreSQL
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Firebase — support both JSON file and environment variable
    FIREBASE_CREDENTIALS_PATH = os.environ.get(
        'FIREBASE_CREDENTIALS_PATH',
        str(BASE_DIR / 'firebase_service_account.json'),
    )
    # JSON-encoded credentials from env var (for Railway / production)
    FIREBASE_CREDENTIALS_JSON = os.environ.get('FIREBASE_CREDENTIALS_JSON', '')

    # ML Model — robust path resolution
    ML_MODEL_PATH = _resolve_model_path()

    # CORS — allow all origins in dev; restrict in production
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')

    # Business-logic tunables
    COOKING_BUFFER = float(os.environ.get('COOKING_BUFFER', '1.1'))
    WASTE_DONATION_THRESHOLD = float(os.environ.get('WASTE_DONATION_THRESHOLD', '5'))

    # Feature flags (safe rollout)
    FEATURE_DONATION_V2 = os.environ.get('FEATURE_DONATION_V2', 'true').lower() == 'true'
    FEATURE_NGO = os.environ.get('FEATURE_NGO', 'true').lower() == 'true'
    FEATURE_SSE = os.environ.get('FEATURE_SSE', 'true').lower() == 'true'

    # Donation/NGO defaults
    NGO_DEFAULT_RADIUS_KM = float(os.environ.get('NGO_DEFAULT_RADIUS_KM', '8'))
    NGO_DEFAULT_SPEED_KMH = float(os.environ.get('NGO_DEFAULT_SPEED_KMH', '25'))
    DONATION_LISTING_EXPIRY_HOURS = float(os.environ.get('DONATION_LISTING_EXPIRY_HOURS', '6'))

    # Fix Heroku/Railway postgres URI scheme
    if SQLALCHEMY_DATABASE_URI and SQLALCHEMY_DATABASE_URI.startswith('postgres://'):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace('postgres://', 'postgresql://', 1)


class DevelopmentConfig(Config):
    DEBUG = True
    FLASK_ENV = 'development'


class ProductionConfig(Config):
    DEBUG = False
    FLASK_ENV = 'production'


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'


config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
}
