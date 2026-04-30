from app import db
from datetime import datetime, timezone


class NgoProfile(db.Model):
    __tablename__ = 'ngos'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True, index=True)
    ngo_name = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(50), nullable=True)
    email = db.Column(db.String(255), nullable=True)
    base_lat = db.Column(db.Numeric(9, 6), nullable=False)
    base_lng = db.Column(db.Numeric(9, 6), nullable=False)
    address = db.Column(db.String(255), nullable=True)
    service_radius_km = db.Column(db.Numeric(6, 2), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'ngo_name': self.ngo_name,
            'phone': self.phone,
            'email': self.email,
            'base_lat': float(self.base_lat),
            'base_lng': float(self.base_lng),
            'address': self.address,
            'service_radius_km': float(self.service_radius_km),
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
