from datetime import datetime, timezone, timedelta
from flask import current_app

from app import db
from app.models.donation_listing import DonationListing
from app.services.donation_state_machine import validate_transition
from app.services.notification_service import log_audit_event


REQUIRED_FINALIZE_FIELDS = ['pickup_start', 'pickup_end', 'lat', 'lng', 'address']


def parse_datetime(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    except Exception:
        return None


def build_listing_payload(data, current_user, status_override=None):
    item_name = (data.get('item_name') or '').strip()
    if not item_name:
        raise ValueError('item_name is required')

    quantity = float(data.get('quantity', 0))
    if quantity <= 0:
        raise ValueError('quantity must be greater than 0')

    unit = (data.get('unit') or 'units').strip()
    category = (data.get('category') or '').strip() or None
    waste_context = (data.get('waste_context') or 'manual').strip()

    pickup_start = parse_datetime(data.get('pickup_start'))
    pickup_end = parse_datetime(data.get('pickup_end'))

    lat = data.get('lat')
    lng = data.get('lng')
    if lat is not None:
        lat = float(lat)
    if lng is not None:
        lng = float(lng)
    address = (data.get('address') or '').strip() or None

    expires_at = parse_datetime(data.get('expires_at'))
    if not expires_at:
        hours = float(current_app.config.get('DONATION_LISTING_EXPIRY_HOURS', 6))
        expires_at = datetime.now(timezone.utc) + timedelta(hours=hours)

    status = status_override or data.get('status') or 'available'

    listing = DonationListing(
        canteen_id=current_user.id,
        user_id=current_user.id,
        item_name=item_name,
        category=category,
        quantity=quantity,
        unit=unit,
        waste_context=waste_context,
        pickup_start=pickup_start,
        pickup_end=pickup_end,
        lat=lat,
        lng=lng,
        address=address,
        expires_at=expires_at,
        status=status,
    )
    return listing


def ensure_finalizable_fields(data):
    missing = []
    for field in REQUIRED_FINALIZE_FIELDS:
        if data.get(field) in [None, '', []]:
            missing.append(field)
    if missing:
        raise ValueError(f"Missing required fields for availability: {', '.join(missing)}")

    pickup_start = parse_datetime(data.get('pickup_start'))
    pickup_end = parse_datetime(data.get('pickup_end'))
    if not pickup_start or not pickup_end:
        raise ValueError('pickup_start and pickup_end must be valid ISO timestamps')
    if pickup_start >= pickup_end:
        raise ValueError('pickup_end must be after pickup_start')


def transition_listing(listing, next_status, actor_user_id=None, metadata=None):
    current_status = listing.status
    validate_transition(current_status, next_status)
    listing.status = next_status
    log_audit_event(
        donation_id=listing.id,
        event_type='status_change',
        actor_user_id=actor_user_id,
        from_status=current_status,
        to_status=next_status,
        metadata=metadata,
    )


def commit_changes(*models):
    for model in models:
        if model is None:
            continue
        db.session.add(model)
    db.session.commit()
