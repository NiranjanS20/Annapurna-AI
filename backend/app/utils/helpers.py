"""
Shared helper utilities used across controllers and services.
"""

from datetime import datetime, date, timedelta
from flask import jsonify
import logging

logger = logging.getLogger(__name__)


def json_response(data=None, message='Success', status=200, success=True):
    """Return a standardised JSON API response."""
    body = {
        'success': success,
        'message': message,
    }
    if data is not None:
        body['data'] = data
    return jsonify(body), status


def error_response(message='An error occurred', status=400, errors=None):
    """Return a standardised error JSON response."""
    body = {
        'success': False,
        'message': message,
    }
    if errors:
        body['errors'] = errors
    return jsonify(body), status


def parse_date(date_string):
    """
    Parse a date from various common formats.
    Returns a datetime.date or None.
    """
    if isinstance(date_string, date):
        return date_string

    formats = ['%Y-%m-%d', '%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M:%S%z']
    for fmt in formats:
        try:
            return datetime.strptime(date_string[:26], fmt).date()
        except (ValueError, TypeError):
            continue
    logger.warning('Could not parse date string: %s', date_string)
    return date.today()


def get_day_features(target_date=None):
    """
    Extract ML features from a date.
    Returns dict with day_of_week (0-6), is_weekend (0/1), meal_type (encoded).
    """
    if target_date is None:
        target_date = date.today()

    if isinstance(target_date, str):
        target_date = parse_date(target_date)

    day_of_week = target_date.weekday()  # 0=Mon, 6=Sun
    is_weekend = 1 if day_of_week >= 5 else 0

    # Simple meal-type heuristic based on time of day — default to lunch
    hour = datetime.now().hour
    if hour < 11:
        meal_type = 0  # breakfast
    elif hour < 15:
        meal_type = 1  # lunch
    else:
        meal_type = 2  # dinner

    return {
        'day_of_week': day_of_week,
        'is_weekend': is_weekend,
        'meal_type': meal_type,
    }


def time_ago(dt):
    """Human-readable 'time ago' string from a datetime."""
    if dt is None:
        return 'unknown'

    now = datetime.utcnow()
    if dt.tzinfo:
        from datetime import timezone
        now = datetime.now(timezone.utc)

    diff = now - dt
    seconds = int(diff.total_seconds())

    if seconds < 60:
        return f'{seconds} secs ago'
    elif seconds < 3600:
        return f'{seconds // 60} mins ago'
    elif seconds < 86400:
        return f'{seconds // 3600} hours ago'
    else:
        return f'{seconds // 86400} days ago'
