from app.models.ngo_profile import NgoProfile
from app.utils.geo import haversine_km


def find_nearby_ngos(lat, lng, radius_km):
    ngos = NgoProfile.query.filter_by(is_active=True).all()
    matches = []
    for ngo in ngos:
        distance = haversine_km(lat, lng, float(ngo.base_lat), float(ngo.base_lng))
        if distance <= float(ngo.service_radius_km or radius_km):
            matches.append((ngo, distance))
    return matches
