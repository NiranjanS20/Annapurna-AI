"""
ML Model Training Script.
Trains a Linear Regression model on historical daily_logs data.

Usage:
    cd backend
    python -m ml_models.train_model

Or from the project root:
    python ml_models/train_model.py
"""

import os
import sys
import logging
import numpy as np
from datetime import datetime

# Add backend to path so we can import the Flask app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)


def generate_synthetic_data():
    """
    Generate synthetic training data when there's not enough real data.
    This creates a baseline model that can be improved with real data over time.
    """
    from sklearn.linear_model import LinearRegression
    import joblib

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

    # Meal type: 0=breakfast, 1=lunch, 2=dinner
    meal_type = np.random.choice([0, 1, 2], n_samples, p=[0.2, 0.5, 0.3])
    meal_boost = np.where(meal_type == 1, 15, np.where(meal_type == 2, 10, 0))

    # Target: demand
    demand = base_demand + meal_boost + np.random.normal(0, 8, n_samples)
    demand = np.maximum(demand, 5)  # floor at 5

    X = np.column_stack([day_of_week, is_weekend, lag_1, lag_3_avg, meal_type])
    y = demand

    # Train
    model = LinearRegression()
    model.fit(X, y)

    # Evaluate
    from sklearn.metrics import mean_absolute_error, r2_score
    predictions = model.predict(X)
    mae = mean_absolute_error(y, predictions)
    r2 = r2_score(y, predictions)

    logger.info('Model trained on %d synthetic samples', n_samples)
    logger.info('  MAE: %.2f', mae)
    logger.info('  R²:  %.4f', r2)
    logger.info('  Coefficients: %s', model.coef_)
    logger.info('  Intercept: %.2f', model.intercept_)

    # Save
    model_dir = os.path.dirname(__file__)
    model_path = os.path.join(model_dir, 'demand_model.pkl')
    os.makedirs(model_dir, exist_ok=True)
    joblib.dump(model, model_path)
    logger.info('Model saved to %s', model_path)

    return model_path


def train_from_database():
    """
    Train the model from actual database records.
    Requires the Flask app to be running or importable.
    """
    try:
        from app import create_app
        app = create_app()

        with app.app_context():
            from app.services.ml_service import train_model_from_db
            success = train_model_from_db()
            if success:
                logger.info('Model trained successfully from database records.')
            else:
                logger.warning('Not enough data in DB. Falling back to synthetic training.')
                generate_synthetic_data()
    except ImportError:
        logger.warning('Flask app not importable. Using synthetic data only.')
        generate_synthetic_data()


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Train the demand prediction model')
    parser.add_argument(
        '--mode',
        choices=['synthetic', 'database', 'auto'],
        default='auto',
        help='Training mode: synthetic (fake data), database (real data), auto (try DB, fallback to synthetic)',
    )
    args = parser.parse_args()

    logger.info('=== Annapurna AI — Model Training ===')
    logger.info('Mode: %s', args.mode)
    logger.info('Time: %s', datetime.now().isoformat())

    if args.mode == 'synthetic':
        generate_synthetic_data()
    elif args.mode == 'database':
        train_from_database()
    else:  # auto
        try:
            train_from_database()
        except Exception as exc:
            logger.warning('DB training failed (%s), falling back to synthetic.', exc)
            generate_synthetic_data()

    logger.info('=== Training complete ===')
