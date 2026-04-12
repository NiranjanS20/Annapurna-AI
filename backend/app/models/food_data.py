from app import db
from datetime import datetime, timezone

class FoodData(db.Model):
    __tablename__ = 'food_data'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    day_of_week = db.Column(db.String(15), nullable=False)
    item_name = db.Column(db.String(255), nullable=False, index=True)
    meal_type = db.Column(db.String(50), nullable=False)
    prepared_qty = db.Column(db.Numeric(10, 2), nullable=False)
    sold_qty = db.Column(db.Numeric(10, 2), nullable=False)
    waste_qty = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'day_of_week': self.day_of_week,
            'item_name': self.item_name,
            'meal_type': self.meal_type,
            'prepared_qty': float(self.prepared_qty),
            'sold_qty': float(self.sold_qty),
            'waste_qty': float(self.waste_qty),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
