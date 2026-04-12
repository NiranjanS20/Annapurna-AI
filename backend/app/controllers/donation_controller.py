"""
Donation controller.
"""
from app.models.donation import Donation
from flask import g
from app.utils.db_transaction import execute_transaction

def get_donations():
    donations = Donation.query.filter_by(user_id=g.current_user.id).order_by(Donation.created_at.desc()).all()
    return [d.to_dict() for d in donations]

def create_donation(data):
    item_name = data.get('item_name')
    quantity = float(data.get('quantity', 0))
    
    donation = Donation(
        item_name=item_name,
        quantity=quantity,
        status='available',
        user_id=g.current_user.id
    )
    execute_transaction(donation)
    return donation.to_dict()

def mark_donation(donation_id):
    from app import db
    donation = Donation.query.filter_by(id=donation_id, user_id=g.current_user.id).first()
    if not donation:
        raise ValueError('Donation not found')
    donation.status = 'picked'
    db.session.commit()
    return donation.to_dict()

