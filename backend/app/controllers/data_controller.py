"""
Data controller.
Manages food_data and menu_items.
"""

import logging
from datetime import datetime
from sqlalchemy import or_
from flask import g

from app import db
from app.utils.db_transaction import execute_transaction
from app.models.menu_item import MenuItem
from app.models.food_data import FoodData
from app.models.prediction import Prediction
from app.models.alert import Alert
from app.models.donation import Donation

logger = logging.getLogger(__name__)

def get_menu_items():
    items = MenuItem.query.filter(or_(MenuItem.user_id == None, MenuItem.user_id == g.current_user.id)).all()
    return [item.to_dict() for item in items]

def add_menu_item(name, category="Custom"):
    item = MenuItem(item_name=name, category=category, user_id=g.current_user.id)
    execute_transaction(item)
    return item.to_dict()

def create_food_data(data):
    """
    Creates FoodData entry and triggers alert logic.
    """
    logger.info("Incoming data: %s", data)
    print("Incoming data:", data)

    date = data.get('date')
    day_of_week = data.get('day_of_week')
    item_name = data.get('item_name')
    meal_type = data.get('meal_type')
    prepared_qty = data.get('prepared_qty')
    sold_qty = data.get('sold_qty')
    waste_qty = data.get('waste_qty')

    # Validate required fields
    if not all([date, item_name, meal_type, prepared_qty, sold_qty]):
        raise ValueError("Missing required fields: date, item_name, meal_type, prepared_qty, or sold_qty")

    prepared_qty = float(prepared_qty)
    sold_qty = float(sold_qty)

    log_date = datetime.strptime(date, '%Y-%m-%d').date()

    # Derive day_of_week if not provided
    if not day_of_week:
        day_of_week = log_date.strftime('%A')

    # Compute waste if not provided
    if waste_qty is None:
        waste_qty = max(0, prepared_qty - sold_qty)
    else:
        waste_qty = float(waste_qty)

    try:
        log = FoodData(
            date=log_date,
            day_of_week=day_of_week,
            item_name=item_name,
            meal_type=meal_type,
            prepared_qty=prepared_qty,
            sold_qty=sold_qty,
            waste_qty=waste_qty,
            user_id=g.current_user.id
        )
        execute_transaction(log)
    except Exception as e:
        logger.error(f"DB ERROR in create_food_data: {str(e)}")
        print("DB ERROR:", str(e))
        raise Exception(f"DB ERROR: {str(e)}")

    # Trigger Alert & Donation Logic
    check_alerts_and_donations(item_name, log_date, prepared_qty, sold_qty, waste_qty)

    return log.to_dict()

def check_alerts_and_donations(item_name, log_date, prep_qty, sold_qty, waste_qty):
    """
    BUSINESS LOGIC
    - Overproduction: if prepared > predicted
    - Waste: if waste > 10 (threshold)
    - Donation Trigger: if waste high, create donation
    """
    try:
        to_insert = []
        
        # 1. Get scoped prediction for this item and date
        prediction = Prediction.query.filter_by(
            item_name=item_name, 
            date=log_date, 
            user_id=g.current_user.id
        ).first()
        predicted_demand = prediction.predicted_demand if prediction else None

        # 2. Overproduction Alert
        if predicted_demand is not None and prep_qty > predicted_demand:
            alert = Alert(
                date=log_date,
                item_name=item_name,
                alert_type='Overproduction',
                message=f"Prepared quantity ({prep_qty}) exceeded predicted demand ({predicted_demand}).",
                severity='medium',
                user_id=g.current_user.id
            )
            to_insert.append(alert)
        
        # 3. Waste Alert & Donation Trigger
        # Updated to 0.0 so ANY surplus is immediately reflected in Donations
        WASTE_THRESHOLD = 0.0
        if waste_qty > WASTE_THRESHOLD:
            # Differentiate severity based on amount
            is_high_waste = waste_qty > 10.0
            
            alert = Alert(
                date=log_date,
                item_name=item_name,
                alert_type='High Waste' if is_high_waste else 'Waste Detected',
                message=f"Waste quantity ({waste_qty}) recorded. Surplus marked for donation.",
                severity='high' if is_high_waste else 'warning',
                user_id=g.current_user.id
            )
            to_insert.append(alert)

            donation = Donation(
                item_name=item_name,
                quantity=waste_qty,
                status='available',
                user_id=g.current_user.id
            )
            to_insert.append(donation)

        if to_insert:
            execute_transaction(*to_insert)
            
    except Exception as e:
        logger.error(f"Error checking alerts/donations: {e}")
        # Note: Do NOT rollback here because execute_transaction already did!
        # Just log strictly.

