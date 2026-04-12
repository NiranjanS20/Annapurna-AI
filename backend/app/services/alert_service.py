"""
Alert generation service.
Creates and persists alerts based on business rules.
"""

import logging
from datetime import date, datetime

from app import db
from app.models.alert import Alert
from app.models.daily_log import DailyLog
from app.models.menu_item import MenuItem

logger = logging.getLogger(__name__)


def generate_alerts_for_log(daily_log, predicted_demand=None):
    """
    Analyse a newly created daily log and generate relevant alerts.
    Called after a data entry is submitted.
    """
    alerts_created = []
    item = MenuItem.query.get(daily_log.menu_item_id)
    item_name = item.name if item else f'Item #{daily_log.menu_item_id}'

    prepared = float(daily_log.quantity_prepared)
    consumed = float(daily_log.quantity_consumed)
    wasted = float(daily_log.quantity_wasted)

    # If we have a predicted demand value, compare against it
    if predicted_demand is not None:
        predicted = float(predicted_demand)

        # Rule 1: Overproduction alert
        if prepared > predicted * 1.15:
            alert = Alert(
                menu_item_id=daily_log.menu_item_id,
                date=daily_log.date,
                type='critical',
                title='Overproduction Warning',
                message=f'{item_name}: prepared {prepared} units vs predicted demand of {predicted}. '
                        f'Reduce preparation by {round(prepared - predicted)} units.',
                severity='high',
            )
            db.session.add(alert)
            alerts_created.append(alert)

        # Rule 2: High demand
        if predicted > _get_historical_avg(daily_log.menu_item_id) * 1.3:
            alert = Alert(
                menu_item_id=daily_log.menu_item_id,
                date=daily_log.date,
                type='warning',
                title='High Demand Expected',
                message=f'{item_name}: predicted demand ({predicted}) '
                        f'is significantly above historical average.',
                severity='medium',
            )
            db.session.add(alert)
            alerts_created.append(alert)

    # Rule 3: High waste ratio
    if prepared > 0 and (wasted / prepared) > 0.20:
        alert = Alert(
            menu_item_id=daily_log.menu_item_id,
            date=daily_log.date,
            type='critical',
            title='High Waste Alert',
            message=f'{item_name}: {round(wasted / prepared * 100)}% waste rate '
                    f'({wasted} wasted out of {prepared} prepared).',
            severity='high',
        )
        db.session.add(alert)
        alerts_created.append(alert)

    # Rule 4: Freshness / expiry alert (time-based — items prepared > 4 hours ago)
    if daily_log.created_at:
        hours_since = (datetime.utcnow() - daily_log.created_at.replace(tzinfo=None)).total_seconds() / 3600
        if hours_since > 4 and wasted > 0:
            alert = Alert(
                menu_item_id=daily_log.menu_item_id,
                date=daily_log.date,
                type='info',
                title='Expiry Alert',
                message=f'{item_name}: {wasted} units remain unsold after {round(hours_since)} hours. '
                        f'Consider donating before spoilage.',
                severity='low',
            )
            db.session.add(alert)
            alerts_created.append(alert)

    if alerts_created:
        db.session.commit()
        logger.info('Generated %d alerts for daily_log %d', len(alerts_created), daily_log.id)

    return alerts_created


def get_all_alerts(limit=50):
    """Fetch the most recent alerts, ordered newest first."""
    return (
        Alert.query
        .order_by(Alert.created_at.desc())
        .limit(limit)
        .all()
    )


def get_alert_summary():
    """Return a quick summary for the dashboard KPI card."""
    total = Alert.query.filter(Alert.date == date.today()).count()
    critical = Alert.query.filter(
        Alert.date == date.today(),
        Alert.type == 'critical'
    ).count()
    return {'count': total, 'critical': critical}


def _get_historical_avg(item_id, days=14):
    """Average consumed quantity for an item over the last N days."""
    from sqlalchemy import func
    from datetime import timedelta

    cutoff = date.today() - timedelta(days=days)
    result = (
        db.session.query(func.avg(DailyLog.quantity_consumed))
        .filter(
            DailyLog.menu_item_id == item_id,
            DailyLog.date >= cutoff,
        )
        .scalar()
    )
    return float(result) if result else 30.0  # default if no history
