from app import db
from datetime import datetime, timezone


class DonationAuditLog(db.Model):
    __tablename__ = 'donation_audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    donation_id = db.Column(db.String(36), db.ForeignKey('donation_listings.id'), nullable=False, index=True)
    actor_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    event_type = db.Column(db.String(50), nullable=False)
    from_status = db.Column(db.String(50), nullable=True)
    to_status = db.Column(db.String(50), nullable=True)
    metadata = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'donation_id': self.donation_id,
            'actor_user_id': self.actor_user_id,
            'event_type': self.event_type,
            'from_status': self.from_status,
            'to_status': self.to_status,
            'metadata': self.metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
