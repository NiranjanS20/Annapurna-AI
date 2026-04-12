from app import db
from datetime import datetime, timezone

class Donation(db.Model):
    __tablename__ = 'donations'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    item_name = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    status = db.Column(db.String(50), nullable=False, default='available')

    def to_dict(self):
        return {
            'id': self.id,
            'item_name': self.item_name,
            'quantity': float(self.quantity),
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
