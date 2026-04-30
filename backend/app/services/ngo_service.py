from app import db
from app.models.ngo_profile import NgoProfile


def get_ngo_profile_for_user(user_id):
    return NgoProfile.query.filter_by(user_id=user_id).first()


def upsert_ngo_profile(user_id, ngo_name, phone, email, base_lat, base_lng, address, service_radius_km, is_active=True):
    profile = NgoProfile.query.filter_by(user_id=user_id).first()
    if profile:
        profile.ngo_name = ngo_name
        profile.phone = phone
        profile.email = email
        profile.base_lat = base_lat
        profile.base_lng = base_lng
        profile.address = address
        profile.service_radius_km = service_radius_km
        profile.is_active = is_active
    else:
        profile = NgoProfile(
            user_id=user_id,
            ngo_name=ngo_name,
            phone=phone,
            email=email,
            base_lat=base_lat,
            base_lng=base_lng,
            address=address,
            service_radius_km=service_radius_km,
            is_active=is_active,
        )
        db.session.add(profile)
    return profile
