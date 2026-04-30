from app import db
from datetime import datetime, timezone
import uuid

LISTING_STATUSES = [
    'draft',
    'available',
    'notified',
    'accepted',
    'pickup_scheduled',
    'completed',
    'expired',
    'cancelled_by_system',
]


class DonationListing(db.Model):
    __tablename__ = 'donation_listings'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    canteen_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    item_name = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100), nullable=True)
    quantity = db.Column(db.Numeric(10, 2), nullable=False)
    unit = db.Column(db.String(30), nullable=False, default='units')
    waste_context = db.Column(db.String(50), nullable=True)

    pickup_start = db.Column(db.DateTime(timezone=True), nullable=True)
    pickup_end = db.Column(db.DateTime(timezone=True), nullable=True)

    lat = db.Column(db.Numeric(9, 6), nullable=True)
    lng = db.Column(db.Numeric(9, 6), nullable=True)
    address = db.Column(db.String(255), nullable=True)

    expires_at = db.Column(db.DateTime(timezone=True), nullable=True, index=True)
    status = db.Column(
        db.Enum(*LISTING_STATUSES, name='donation_listing_status_enum', native_enum=False),
        nullable=False,
        default='draft',
    )

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
            'canteen_id': self.canteen_id,
            'user_id': self.user_id,
            'item_name': self.item_name,
            'category': self.category,
            'quantity': float(self.quantity),
            'unit': self.unit,
            'waste_context': self.waste_context,
            'pickup_start': self.pickup_start.isoformat() if self.pickup_start else None,
            'pickup_end': self.pickup_end.isoformat() if self.pickup_end else None,
            'lat': float(self.lat) if self.lat is not None else None,
            'lng': float(self.lng) if self.lng is not None else None,
            'address': self.address,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
