"""
Alert controller.
"""
from app.models.alert import Alert
from flask import g

def get_alerts():
    alerts = Alert.query.filter_by(user_id=g.current_user.id).order_by(Alert.date.desc()).all()
    return [a.to_dict() for a in alerts]
