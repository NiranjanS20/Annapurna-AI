import math


def haversine_km(lat1, lng1, lat2, lng2):
    """Calculate great-circle distance between two points in kilometers."""
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def estimate_eta_minutes(distance_km, speed_kmh):
    if speed_kmh <= 0:
        return None
    return round((distance_km / speed_kmh) * 60)
