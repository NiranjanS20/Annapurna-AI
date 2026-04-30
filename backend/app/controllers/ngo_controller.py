from datetime import datetime, timezone
from flask import g, current_app

from app import db
from sqlalchemy import or_
from app.models.donation_listing import DonationListing
from app.models.donation_acceptance import DonationAcceptance
from app.models.donation_notification import DonationNotification
from app.services.donation_listing_controller import build_listing_response_for_ngo, estimate_eta
from app.services.donation_state_machine import validate_transition
from app.services.notification_service import publish_event, log_audit_event
from app.services.ngo_service import get_ngo_profile_for_user, upsert_ngo_profile
from app.utils.geo import haversine_km


def get_ngo_profile():
    profile = get_ngo_profile_for_user(g.current_user.id)
    return profile.to_dict() if profile else None


def save_ngo_profile(data):
    ngo_name = (data.get('ngo_name') or '').strip()
    if not ngo_name:
        raise ValueError('ngo_name is required')

    base_lat = data.get('base_lat')
    base_lng = data.get('base_lng')
    if base_lat is None or base_lng is None:
        raise ValueError('base_lat and base_lng are required')

    base_lat = float(base_lat)
    base_lng = float(base_lng)

    service_radius_km = data.get('service_radius_km')
    if service_radius_km is None:
        service_radius_km = current_app.config.get('NGO_DEFAULT_RADIUS_KM', 8)
    service_radius_km = float(service_radius_km)

    profile = upsert_ngo_profile(
        user_id=g.current_user.id,
        ngo_name=ngo_name,
        phone=data.get('phone'),
        email=data.get('email'),
        base_lat=base_lat,
        base_lng=base_lng,
        address=data.get('address'),
        service_radius_km=service_radius_km,
        is_active=bool(data.get('is_active', True)),
    )

    g.current_user.role = 'ngo'
    db.session.add(g.current_user)
    db.session.commit()

    return profile.to_dict()


def get_nearby_donations(lat=None, lng=None, radius_km=None):
    profile = get_ngo_profile_for_user(g.current_user.id)
    if not profile:
        raise ValueError('NGO profile is required before viewing donations')

    if lat is None or lng is None:
        lat = float(profile.base_lat)
        lng = float(profile.base_lng)

    if radius_km is None:
        radius_km = float(profile.service_radius_km)

    now = datetime.now(timezone.utc)
    listings = DonationListing.query.filter(
        DonationListing.status.in_(['available', 'notified']),
        or_(DonationListing.expires_at == None, DonationListing.expires_at >= now),
    ).all()

    results = []
    for listing in listings:
        if listing.lat is None or listing.lng is None:
            continue
        distance = haversine_km(float(listing.lat), float(listing.lng), float(lat), float(lng))
        if distance <= float(radius_km):
            results.append(build_listing_response_for_ngo(listing, distance_km=distance, eta_minutes=estimate_eta(distance)))

    results.sort(key=lambda x: x.get('distance_km', 0))
    return results


def accept_donation(listing_id, idempotency_key=None):
    profile = get_ngo_profile_for_user(g.current_user.id)
    if not profile:
        raise ValueError('NGO profile is required before accepting donations')

    with db.session.begin():
        listing = (
            DonationListing.query
            .filter_by(id=listing_id)
            .with_for_update()
            .first()
        )

        if not listing:
            raise ValueError('Donation listing not found')

        if listing.status not in ['available', 'notified']:
            raise ValueError('Donation listing is not available')

        if listing.expires_at and listing.expires_at < datetime.now(timezone.utc):
            raise ValueError('Donation listing expired')

        if idempotency_key:
            existing = DonationAcceptance.query.filter_by(donation_id=listing.id, idempotency_key=idempotency_key).first()
            if existing:
                return existing.to_dict()

        existing_acceptance = DonationAcceptance.query.filter_by(donation_id=listing.id).first()
        if existing_acceptance:
            return existing_acceptance.to_dict()

        acceptance = DonationAcceptance(
            donation_id=listing.id,
            ngo_id=profile.id,
            accepted_at=datetime.now(timezone.utc),
            status='accepted',
            idempotency_key=idempotency_key,
        )
        db.session.add(acceptance)

        from_status = listing.status
        validate_transition(from_status, 'accepted')
        listing.status = 'accepted'
        db.session.add(listing)

        log_audit_event(listing.id, 'accepted', actor_user_id=g.current_user.id, from_status=from_status, to_status='accepted')

    publish_event({
        'type': 'donation_accepted',
        'donation_id': listing.id,
        'user_id': listing.user_id,
        'ngo_id': profile.id,
    })

    return acceptance.to_dict()


def get_accepted_donations():
    profile = get_ngo_profile_for_user(g.current_user.id)
    if not profile:
        return []

    acceptances = DonationAcceptance.query.filter_by(ngo_id=profile.id).order_by(DonationAcceptance.accepted_at.desc()).all()
    listing_ids = [a.donation_id for a in acceptances]
    listings = {}
    if listing_ids:
        listings = {l.id: l for l in DonationListing.query.filter(DonationListing.id.in_(listing_ids)).all()}

    results = []
    for acceptance in acceptances:
        listing = listings.get(acceptance.donation_id)
        payload = acceptance.to_dict()
        payload['listing'] = listing.to_dict() if listing else None
        results.append(payload)

    return results

#listing of notifications
def list_notifications():
    profile = get_ngo_profile_for_user(g.current_user.id)
    if not profile:
        return []

    notifications = DonationNotification.query.filter_by(ngo_id=profile.id).order_by(DonationNotification.notified_at.desc()).all()
    return [n.to_dict() for n in notifications]


def mark_notification_read(notification_id):
    profile = get_ngo_profile_for_user(g.current_user.id)
    if not profile:
        raise ValueError('NGO profile not found')

    notification = DonationNotification.query.filter_by(id=notification_id, ngo_id=profile.id).first()
    if not notification:
        raise ValueError('Notification not found')

    notification.read_status = True
    db.session.commit()
    return notification.to_dict()
