from app import db
from datetime import datetime, timezone

ACCEPTANCE_STATUSES = ['accepted', 'pickup_scheduled', 'completed', 'cancelled', 'expired']


class DonationAcceptance(db.Model):
    __tablename__ = 'donation_acceptances'

    id = db.Column(db.Integer, primary_key=True)
    donation_id = db.Column(db.String(36), db.ForeignKey('donation_listings.id'), nullable=False, unique=True, index=True)
    ngo_id = db.Column(db.Integer, db.ForeignKey('ngos.id'), nullable=False, index=True)
    accepted_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    pickup_eta = db.Column(db.DateTime(timezone=True), nullable=True)
    status = db.Column(
        db.Enum(*ACCEPTANCE_STATUSES, name='donation_acceptance_status_enum', native_enum=False),
        nullable=False,
        default='accepted',
    )
    completion_timestamp = db.Column(db.DateTime(timezone=True), nullable=True)
    idempotency_key = db.Column(db.String(64), nullable=True, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'donation_id': self.donation_id,
            'ngo_id': self.ngo_id,
            'accepted_at': self.accepted_at.isoformat() if self.accepted_at else None,
            'pickup_eta': self.pickup_eta.isoformat() if self.pickup_eta else None,
            'status': self.status,
            'completion_timestamp': self.completion_timestamp.isoformat() if self.completion_timestamp else None,
            'idempotency_key': self.idempotency_key,
        }
