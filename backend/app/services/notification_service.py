import queue
import threading
import uuid
from datetime import datetime, timezone

from app import db
from app.models.donation_notification import DonationNotification
from app.models.donation_audit_log import DonationAuditLog

_listeners = []
_listeners_lock = threading.Lock()


def register_listener(filter_fn):
    listener_id = str(uuid.uuid4())
    q = queue.Queue()
    with _listeners_lock:
        _listeners.append({'id': listener_id, 'queue': q, 'filter': filter_fn})
    return listener_id, q


def unregister_listener(listener_id):
    with _listeners_lock:
        _listeners[:] = [l for l in _listeners if l['id'] != listener_id]


def publish_event(event):
    with _listeners_lock:
        listeners_snapshot = list(_listeners)

    for listener in listeners_snapshot:
        try:
            if listener['filter'](event):
                listener['queue'].put(event)
        except Exception:
            continue


def create_ngo_notification(donation_id, ngo_id, channel='sse', delivery_status='sent'):
    notification = DonationNotification(
        donation_id=donation_id,
        ngo_id=ngo_id,
        notified_at=datetime.now(timezone.utc),
        channel=channel,
        delivery_status=delivery_status,
        read_status=False,
    )
    db.session.add(notification)
    return notification


def log_audit_event(donation_id, event_type, actor_user_id=None, from_status=None, to_status=None, metadata=None):
    log = DonationAuditLog(
        donation_id=donation_id,
        event_type=event_type,
        actor_user_id=actor_user_id,
        from_status=from_status,
        to_status=to_status,
        metadata=metadata,
    )
    db.session.add(log)
    return log
