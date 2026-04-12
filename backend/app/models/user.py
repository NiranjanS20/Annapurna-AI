from app import db
from datetime import datetime, timezone

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    firebase_uid = db.Column(db.String(128), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True, nullable=True, index=True)
    full_name = db.Column(db.String(255), nullable=True)
    business_name = db.Column(db.String(255), nullable=True)
    business_type = db.Column(db.String(100), nullable=True)
    location = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(50), nullable=False, default='admin')
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'firebase_uid': self.firebase_uid,
            'email': self.email,
            'full_name': self.full_name,
            'business_name': self.business_name,
            'business_type': self.business_type,
            'location': self.location,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
