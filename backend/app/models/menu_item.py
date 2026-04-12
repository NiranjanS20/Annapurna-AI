from app import db

class MenuItem(db.Model):
    __tablename__ = 'menu_items'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    item_name = db.Column(db.String(255), nullable=False, index=True)
    category = db.Column(db.String(100), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'item_name': self.item_name,
            'category': self.category
        }
