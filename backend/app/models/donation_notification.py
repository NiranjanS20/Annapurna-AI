from app import db
from datetime import datetime, timezone

NOTIFICATION_STATUSES = ['pending', 'sent', 'failed']


class DonationNotification(db.Model):
    __tablename__ = 'donation_notifications'

    id = db.Column(db.Integer, primary_key=True)
    donation_id = db.Column(db.String(36), db.ForeignKey('donation_listings.id'), nullable=False, index=True)
    ngo_id = db.Column(db.Integer, db.ForeignKey('ngos.id'), nullable=False, index=True)
    notified_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    channel = db.Column(db.String(50), nullable=False, default='sse')
    delivery_status = db.Column(
        db.Enum(*NOTIFICATION_STATUSES, name='donation_notification_status_enum', native_enum=False),
        nullable=False,
        default='sent',
    )
    read_status = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'donation_id': self.donation_id,
            'ngo_id': self.ngo_id,
            'notified_at': self.notified_at.isoformat() if self.notified_at else None,
            'channel': self.channel,
            'delivery_status': self.delivery_status,
            'read_status': self.read_status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
