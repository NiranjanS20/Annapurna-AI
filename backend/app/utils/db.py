"""
Database seeding and utility functions.
Pre-populates menu_items so the frontend dropdowns work out of the box.
"""

import logging
from app import db
from app.models.menu_item import MenuItem

logger = logging.getLogger(__name__)

# These must match the ITEMS array in the frontend (DataEntry.jsx / Prediction.jsx)
DEFAULT_MENU_ITEMS = [
    {'name': 'Burgers', 'category': 'Main Course'},
    {'name': 'Pizza', 'category': 'Main Course'},
    {'name': 'Salads', 'category': 'Sides'},
    {'name': 'Fries', 'category': 'Sides'},
    {'name': 'Sandwiches', 'category': 'Main Course'},
    {'name': 'Pasta', 'category': 'Main Course'},
]


def seed_menu_items():
    """Insert default menu items if the table is empty."""
    if MenuItem.query.first() is not None:
        return  # already seeded

    for item_data in DEFAULT_MENU_ITEMS:
        item = MenuItem(item_name=item_data['name'], category=item_data['category'])
        db.session.add(item)

    db.session.commit()
    logger.info('Seeded %d default menu items.', len(DEFAULT_MENU_ITEMS))


def reset_database():
    """Drop and recreate all tables. USE ONLY IN DEVELOPMENT."""
    db.drop_all()
    db.create_all()
    seed_menu_items()
    logger.warning('Database reset complete.')
