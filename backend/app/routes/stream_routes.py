import json
import logging
import queue

from flask import Blueprint, Response, stream_with_context, g, current_app

from app.middleware.auth_middleware import firebase_auth_required
from app.models.ngo_profile import NgoProfile
from app.services.notification_service import register_listener, unregister_listener

logger = logging.getLogger(__name__)

stream_bp = Blueprint('stream', __name__)


def _sse_enabled():
    return current_app.config.get('FEATURE_SSE', True)


@stream_bp.route('/notifications', methods=['GET'])
@firebase_auth_required
def stream_notifications():
    if not _sse_enabled():
        return Response('SSE disabled', status=404)

    user_role = (g.current_user.role or 'canteen').lower()
    ngo_id = None
    if user_role == 'ngo':
        profile = NgoProfile.query.filter_by(user_id=g.current_user.id).first()
        ngo_id = profile.id if profile else None

    def filter_fn(event):
        if user_role == 'ngo':
            return ngo_id is not None and event.get('ngo_id') == ngo_id
        return event.get('user_id') == g.current_user.id

    listener_id, q = register_listener(filter_fn)

    def generate():
        try:
            yield 'data: {"status": "ok"}\n\n'
            while True:
                try:
                    event = q.get(timeout=20)
                except queue.Empty:
                    yield 'data: {}\n\n'
                    continue

                payload = json.dumps(event)
                yield f"data: {payload}\n\n"
        finally:
            unregister_listener(listener_id)

    headers = {
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
    }
    return Response(stream_with_context(generate()), mimetype='text/event-stream', headers=headers)
