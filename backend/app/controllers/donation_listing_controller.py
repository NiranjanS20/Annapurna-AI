from datetime import datetime, timezone
from flask import g, current_app

from app import db
from app.models.donation_listing import DonationListing
from app.models.donation_acceptance import DonationAcceptance
from app.services.donation_service import (
    build_listing_payload,
    ensure_finalizable_fields,
    parse_datetime,
    transition_listing,
    commit_changes,
)
from app.services.matching_service import find_nearby_ngos
from app.services.notification_service import create_ngo_notification, publish_event, log_audit_event
from app.utils.geo import estimate_eta_minutes


def get_canteen_listings():
    listings = (
        DonationListing.query
        .filter_by(user_id=g.current_user.id)
        .order_by(DonationListing.created_at.desc())
        .all()
    )
    return [l.to_dict() for l in listings]


def get_listing_for_canteen(listing_id):
    return DonationListing.query.filter_by(id=listing_id, user_id=g.current_user.id).first()


def _notify_nearby_ngos(listing):
    if not current_app.config.get('FEATURE_NGO', True):
        return []
    if listing.lat is None or listing.lng is None:
        return []

    matches = find_nearby_ngos(float(listing.lat), float(listing.lng), radius_km=0)
    created_notifications = []

    for ngo, distance in matches:
        notification = create_ngo_notification(listing.id, ngo.id)
        created_notifications.append(notification)
        publish_event({
            'type': 'donation_available',
            'donation_id': listing.id,
            'ngo_id': ngo.id,
            'distance_km': round(distance, 2),
        })

    if created_notifications:
        transition_listing(listing, 'notified', actor_user_id=listing.user_id)
        log_audit_event(listing.id, 'ngo_notified', actor_user_id=listing.user_id)

    return created_notifications


def create_listing(data):
    status = (data.get('status') or 'available').strip()
    if status not in ['draft', 'available']:
        status = 'available'

    if status == 'available':
        ensure_finalizable_fields(data)

    listing = build_listing_payload(data, g.current_user, status_override=status)
    db.session.add(listing)
    log_audit_event(listing.id, 'created', actor_user_id=g.current_user.id, to_status=listing.status)

    notifications = []
    if status == 'available':
        notifications = _notify_nearby_ngos(listing)

    commit_changes(listing, *notifications)
    return listing.to_dict()


def finalize_listing(listing, data):
    if listing.status != 'draft':
        raise ValueError('Only draft listings can be finalized')

    ensure_finalizable_fields(data)

    listing.pickup_start = listing.pickup_start or parse_datetime(data.get('pickup_start'))
    listing.pickup_end = listing.pickup_end or parse_datetime(data.get('pickup_end'))
    listing.lat = listing.lat or (float(data.get('lat')) if data.get('lat') is not None else None)
    listing.lng = listing.lng or (float(data.get('lng')) if data.get('lng') is not None else None)
    listing.address = listing.address or data.get('address')

    transition_listing(listing, 'available', actor_user_id=g.current_user.id)

    notifications = _notify_nearby_ngos(listing)
    commit_changes(listing, *notifications)
    return listing.to_dict()


def schedule_pickup(listing, pickup_eta):
    if listing.status != 'accepted':
        raise ValueError('Pickup can only be scheduled after acceptance')

    acceptance = DonationAcceptance.query.filter_by(donation_id=listing.id).first()
    if not acceptance:
        raise ValueError('No acceptance record found for listing')

    acceptance.pickup_eta = pickup_eta
    acceptance.status = 'pickup_scheduled'
    transition_listing(listing, 'pickup_scheduled', actor_user_id=g.current_user.id)
    commit_changes(listing, acceptance)

    publish_event({
        'type': 'pickup_scheduled',
        'donation_id': listing.id,
        'user_id': listing.user_id,
    })

    return listing.to_dict()


def complete_listing(listing):
    if listing.status != 'pickup_scheduled':
        raise ValueError('Only pickup_scheduled listings can be completed')

    acceptance = DonationAcceptance.query.filter_by(donation_id=listing.id).first()
    if acceptance:
        acceptance.status = 'completed'
        acceptance.completion_timestamp = datetime.now(timezone.utc)

    transition_listing(listing, 'completed', actor_user_id=g.current_user.id)
    commit_changes(listing, acceptance)

    publish_event({
        'type': 'donation_completed',
        'donation_id': listing.id,
        'user_id': listing.user_id,
    })

    return listing.to_dict()


def build_listing_response_for_ngo(listing, distance_km=None, eta_minutes=None):
    payload = listing.to_dict()
    if distance_km is not None:
        payload['distance_km'] = round(distance_km, 2)
    if eta_minutes is not None:
        payload['eta_minutes'] = eta_minutes
    return payload


def estimate_eta(distance_km):
    speed = float(current_app.config.get('NGO_DEFAULT_SPEED_KMH', 25))
    return estimate_eta_minutes(distance_km, speed)
