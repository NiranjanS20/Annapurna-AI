"""
Donation controller.
Manages simple donation records (legacy surplus tracking).
"""
import logging
from app import db
from app.models.donation import Donation
from flask import g
from app.utils.db_transaction import execute_transaction

logger = logging.getLogger(__name__)


def get_donations():
    donations = Donation.query.filter_by(user_id=g.current_user.id).order_by(Donation.created_at.desc()).all()
    return [d.to_dict() for d in donations]


def get_donation_for_user(donation_id):
    return Donation.query.filter_by(id=donation_id, user_id=g.current_user.id).first()


def create_donation(data):
    item_name = (data.get('item_name') or '').strip()
    if not item_name:
        raise ValueError('item_name is required')

    quantity = data.get('quantity', 0)
    try:
        quantity = float(quantity)
    except (TypeError, ValueError):
        raise ValueError('quantity must be a valid number')
    if quantity < 0:
        raise ValueError('quantity cannot be negative')

    donation = Donation(
        item_name=item_name,
        quantity=quantity,
        status='available',
        user_id=g.current_user.id
    )
    execute_transaction(donation)
    return donation.to_dict()


def mark_donation(donation_id):
    """Mark a donation as picked. Includes session safety."""
    # Session safety — clear any poisoned state
    try:
        db.session.rollback()
    except Exception:
        pass

    donation = Donation.query.filter_by(id=donation_id, user_id=g.current_user.id).first()
    if not donation:
        raise ValueError('Donation not found')
    if donation.status == 'picked':
        return donation.to_dict()  # Idempotent — already marked

    donation.status = 'picked'
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error('Failed to mark donation %s: %s', donation_id, e)
        raise
    return donation.to_dict()
