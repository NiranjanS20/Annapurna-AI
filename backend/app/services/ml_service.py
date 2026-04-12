"""
ML prediction service.
Loads a trained model (Linear Regression) from disk and predicts food demand.
Falls back to heuristic averages when no model or data is available.
"""

import logging
import os
from datetime import date, timedelta

try:
    import numpy as np
except Exception:
    np = None

from app import db
from app.models.food_data import FoodData
from app.models.menu_item import MenuItem
from app.utils.helpers import get_day_features

logger = logging.getLogger(__name__)

_model = None
_model_path = None


def init_ml(model_path):
    """Set the path for the ML model file."""
    global _model_path
    _model_path = model_path
    _load_model()


def _load_model():
    """Attempt to load the trained model from disk."""
    global _model
    if _model_path and os.path.exists(_model_path):
        try:
            import joblib
            _model = joblib.load(_model_path)
            logger.info('ML model loaded from %s', _model_path)
        except Exception as exc:
            logger.warning('Could not load ML model: %s. Using heuristic fallback.', exc)
            _model = None
    else:
        logger.info('No ML model found at %s. Using heuristic fallback.', _model_path)
        _model = None


def _get_lag_features(item_name, target_date):
    """
    Compute lag features from historical FoodData.
    - lag_1_demand: demand (sold_qty) from yesterday
    - lag_3_avg:    average demand over last 3 days
    """
    logs = (
        FoodData.query
        .filter(
            FoodData.item_name == item_name,
            FoodData.date < target_date,
        )
        .order_by(DailyLog.date.desc())
        .limit(7)
        .all()
    )

    if not logs:
        # No history — return category average or global default
        return _get_fallback_lags(item_name)

    demands = [float(log.sold_qty) for log in logs]

    lag_1 = demands[0] if len(demands) >= 1 else 30.0
    lag_3_source = demands[:3] if len(demands) >= 1 else []
    lag_3_avg = float(sum(lag_3_source) / len(lag_3_source)) if lag_3_source else 30.0

    return lag_1, lag_3_avg


def _get_fallback_lags(item_name):
    """
    Edge case: no history for this item → use category average.
    If still nothing, use a sensible global default of 30 units.
    """
    item = MenuItem.query.filter_by(item_name=item_name).first()
    if item is None:
        return 30.0, 30.0

    # Try category average
    from sqlalchemy import func
    avg_result = (
        db.session.query(func.avg(FoodData.sold_qty))
        .join(MenuItem, MenuItem.item_name == FoodData.item_name)
        .filter(MenuItem.category == item.category)
        .scalar()
    )

    avg_val = float(avg_result) if avg_result else 30.0
    return avg_val, avg_val


def predict_demand(item_name, target_date=None):
    """
    Predict demand for a menu item on a given date.
    Returns dict: {predicted_demand, recommended_qty, confidence, alert_message}
    """
    if target_date is None:
        target_date = date.today() + timedelta(days=1)

    features = get_day_features(target_date)
    lag_1, lag_3_avg = _get_lag_features(item_name, target_date)

    feature_vector = [[
        features['day_of_week'],
        features['is_weekend'],
        lag_1,
        lag_3_avg,
        features['meal_type'],
    ]]

    if np is not None:
        feature_vector = np.array(feature_vector)

    if _model is not None:
        try:
            predicted = float(_model.predict(feature_vector)[0])
            predicted = max(predicted, 0)
            confidence = 85.0  # base confidence when model exists
        except Exception as exc:
            logger.warning('Model prediction failed: %s. Using fallback.', exc)
            predicted = (lag_1 + lag_3_avg) / 2
            confidence = 60.0
    else:
        # Heuristic fallback: weighted average of lags with weekend adjustment
        predicted = (lag_1 * 0.4 + lag_3_avg * 0.6)
        if features['is_weekend']:
            predicted *= 1.2  # weekends are typically busier
        confidence = 65.0

    predicted = round(predicted, 1)

    # Business logic: recommended qty = predicted * buffer
    from flask import current_app
    buffer = current_app.config.get('COOKING_BUFFER', 1.1)
    recommended_qty = round(predicted * buffer, 1)

    # Generate insight message
    alert_message = _generate_insight(predicted, lag_1, lag_3_avg, features)

    return {
        'predicted_demand': predicted,
        'recommended_qty': recommended_qty,
        'confidence': confidence,
        'alert_message': alert_message,
    }


def _generate_insight(predicted, lag_1, lag_3_avg, features):
    """Generate a human-readable AI insight message."""
    if features['is_weekend']:
        base = 'Weekend detected — expect higher footfall. '
    else:
        base = 'Normal weekday pattern. '

    if predicted > lag_3_avg * 1.3:
        return base + f'Demand is trending UP ({round(predicted)}) vs 3-day avg ({round(lag_3_avg)}). Consider preparing more.'
    elif predicted < lag_3_avg * 0.7:
        return base + f'Demand is trending DOWN ({round(predicted)}) vs 3-day avg ({round(lag_3_avg)}). Reduce preparation to cut waste.'
    else:
        return base + f'Demand is stable around {round(predicted)} units. Normal preparation recommended.'


def train_model_from_db():
    """
    Train a LinearRegression model on all historical FoodData and save to disk.
    Called from the training script or admin endpoint.
    """
    logs = FoodData.query.order_by(FoodData.date).all()
    if len(logs) < 10:
        logger.warning('Not enough data to train (%d records). Need at least 10.', len(logs))
        return False

    if np is None:
        logger.warning('NumPy is not installed; ML training is unavailable.')
        return False

    from collections import defaultdict
    import joblib
    from sklearn.linear_model import LinearRegression

    # Group by item to compute lag features
    by_item = defaultdict(list)
    for log in logs:
        by_item[log.item_name].append(log)

    X, y = [], []
    for item_name, item_logs in by_item.items():
        item_logs.sort(key=lambda l: l.date)
        for i in range(3, len(item_logs)):
            features_dict = get_day_features(item_logs[i].date)
            lag_1 = float(item_logs[i - 1].sold_qty)
            lag_3_avg = float(np.mean([float(item_logs[j].sold_qty) for j in range(i - 3, i)]))

            X.append([
                features_dict['day_of_week'],
                features_dict['is_weekend'],
                lag_1,
                lag_3_avg,
                features_dict['meal_type'],
            ])
            y.append(float(item_logs[i].sold_qty))

    if len(X) < 5:
        logger.warning('Insufficient feature rows (%d) after lag computation.', len(X))
        return False

    X = np.array(X)
    y = np.array(y)

    model = LinearRegression()
    model.fit(X, y)

    os.makedirs(os.path.dirname(_model_path), exist_ok=True)
    joblib.dump(model, _model_path)

    global _model
    _model = model
    logger.info('Model trained on %d samples and saved to %s', len(X), _model_path)
    return True
