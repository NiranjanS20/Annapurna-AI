from app import db

class Prediction(db.Model):
    __tablename__ = 'predictions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    item_name = db.Column(db.String(255), nullable=False, index=True)
    predicted_demand = db.Column(db.Numeric(10, 2), nullable=False)
    recommended_qty = db.Column(db.Numeric(10, 2), nullable=False)
    confidence_score = db.Column(db.Numeric(5, 2))

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'item_name': self.item_name,
            'predicted_demand': float(self.predicted_demand),
            'recommended_qty': float(self.recommended_qty),
            'confidence_score': float(self.confidence_score) if self.confidence_score else None
        }
