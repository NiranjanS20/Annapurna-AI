"""
ML Model Training Script.
Trains a demand prediction model using real food-order data from CSV files.

Supports three modes:
  --mode csv       Train from the CSV data files (recommended for initial setup)
  --mode database  Train from the Flask app's database records
  --mode auto      Try CSV first, then database, then synthetic fallback

Usage:
    cd ml_models
    python -m training.train_model --mode csv

Or from the project root:
    python -m ml_models.training.train_model --mode csv
"""

import os
import sys
import logging
import argparse
from datetime import datetime

import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Add paths for imports
ML_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(ML_ROOT)
sys.path.insert(0, ML_ROOT)
sys.path.insert(0, os.path.join(PROJECT_ROOT, 'backend'))

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# Output directory for trained models
MODELS_DIR = os.path.join(ML_ROOT, 'models')
MODEL_PATH = os.path.join(MODELS_DIR, 'demand_model.pkl')

# The 5 core features the backend ML service expects
CORE_FEATURES = ['day_of_week', 'is_weekend', 'lag_1_demand', 'lag_3_avg', 'meal_type']


def train_from_csv():
    """
    Train using the real CSV data after preprocessing.
    This is the recommended mode for initial model creation.
    """
    from training.preprocess import run_preprocessing

    logger.info('Running preprocessing pipeline...')
    df, all_feature_cols, target_col = run_preprocessing()

    if len(df) < 50:
        logger.warning('Insufficient data after preprocessing (%d rows).', len(df))
        return False

    # --- Train with CORE features only (what the backend will use) ---
    # The backend sends only 5 features, so the production model must work with those
    logger.info('Training production model with core features: %s', CORE_FEATURES)

    X = df[CORE_FEATURES].values
    y = df[target_col].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train RandomForestRegressor (much better than LinearRegression for this data)
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # Evaluate
    train_pred = model.predict(X_train)
    test_pred = model.predict(X_test)

    logger.info('=== Model Evaluation ===')
    logger.info('  Training MAE:  %.2f', mean_absolute_error(y_train, train_pred))
    logger.info('  Test MAE:      %.2f', mean_absolute_error(y_test, test_pred))
    logger.info('  Test RMSE:     %.2f', np.sqrt(mean_squared_error(y_test, test_pred)))
    logger.info('  Test R²:       %.4f', r2_score(y_test, test_pred))

    # Feature importances
    importances = dict(zip(CORE_FEATURES, model.feature_importances_))
    logger.info('  Feature importances:')
    for feat, imp in sorted(importances.items(), key=lambda x: -x[1]):
        logger.info('    %s: %.4f', feat, imp)

    # Save model
    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    logger.info('Production model saved to %s', MODEL_PATH)

    # --- Also save model metadata ---
    metadata = {
        'trained_at': datetime.now().isoformat(),
        'n_train_samples': len(X_train),
        'n_test_samples': len(X_test),
        'test_mae': float(mean_absolute_error(y_test, test_pred)),
        'test_r2': float(r2_score(y_test, test_pred)),
        'features': CORE_FEATURES,
        'model_type': 'RandomForestRegressor',
    }
    import json
    meta_path = os.path.join(MODELS_DIR, 'model_metadata.json')
    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    logger.info('Model metadata saved to %s', meta_path)

    return True


def generate_synthetic_data():
    """
    Generate synthetic training data when no CSV data or DB data is available.
    This creates a baseline model that can be improved with real data.
    """
    logger.info('Generating synthetic training data for baseline model...')

    np.random.seed(42)
    n_samples = 500

    # Features: day_of_week, is_weekend, lag_1_demand, lag_3_avg, meal_type
    day_of_week = np.random.randint(0, 7, n_samples)
    is_weekend = (day_of_week >= 5).astype(int)
    base_demand = 50 + np.random.normal(0, 10, n_samples)

    # Weekend boost
    base_demand += is_weekend * 20

    # Lag features (simulated)
    lag_1 = base_demand + np.random.normal(0, 5, n_samples)
    lag_3_avg = base_demand + np.random.normal(0, 3, n_samples)

    # Meal type: 0-13
    meal_type = np.random.choice(range(14), n_samples)
    meal_boost = np.where(meal_type <= 2, 15, np.where(meal_type <= 5, 10, 0))

    # Target: demand
    demand = base_demand + meal_boost + np.random.normal(0, 8, n_samples)
    demand = np.maximum(demand, 5)

    X = np.column_stack([day_of_week, is_weekend, lag_1, lag_3_avg, meal_type])
    y = demand

    # Train
    model = RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(X, y)

    # Evaluate
    predictions = model.predict(X)
    mae = mean_absolute_error(y, predictions)
    r2 = r2_score(y, predictions)

    logger.info('Synthetic model — MAE: %.2f, R²: %.4f', mae, r2)

    # Save
    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    logger.info('Synthetic model saved to %s', MODEL_PATH)

    return True


def train_from_database():
    """
    Train the model from actual database records.
    Requires the Flask app with a populated database.
    """
    try:
        from app import create_app
        app = create_app()

        with app.app_context():
            from app.services.ml_service import train_model_from_db
            success = train_model_from_db()
            if success:
                logger.info('Model trained successfully from database records.')
                return True
            else:
                logger.warning('Not enough data in DB for training.')
                return False
    except ImportError as e:
        logger.warning('Flask app not importable (%s). Cannot train from DB.', e)
        return False


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train the demand prediction model')
    parser.add_argument(
        '--mode',
        choices=['csv', 'database', 'synthetic', 'auto'],
        default='auto',
        help='Training mode: csv (real CSV data), database (DB records), synthetic (fake data), auto (try csv→db→synthetic)',
    )
    args = parser.parse_args()

    logger.info('=== Annapurna AI — Model Training ===')
    logger.info('Mode: %s', args.mode)
    logger.info('Time: %s', datetime.now().isoformat())

    success = False

    if args.mode == 'csv':
        success = train_from_csv()
    elif args.mode == 'database':
        success = train_from_database()
    elif args.mode == 'synthetic':
        success = generate_synthetic_data()
    else:  # auto
        # Try CSV first → database → synthetic
        try:
            success = train_from_csv()
        except Exception as exc:
            logger.warning('CSV training failed (%s), trying database...', exc)

        if not success:
            try:
                success = train_from_database()
            except Exception as exc:
                logger.warning('DB training failed (%s), falling back to synthetic...', exc)

        if not success:
            success = generate_synthetic_data()

    if success:
        logger.info('=== Training complete — model saved to %s ===', MODEL_PATH)
    else:
        logger.error('=== Training FAILED ===')
        sys.exit(1)
