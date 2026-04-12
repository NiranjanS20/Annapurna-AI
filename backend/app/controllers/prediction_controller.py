"""
Prediction controller.
Handles fetching historical data, ML evaluation, and returning predictions.
Uses item_name + day_of_week for predictions based on historical data.
"""

import logging
from datetime import datetime, timedelta
from app import db
from app.models.prediction import Prediction
from app.models.food_data import FoodData
from app.models.alert import Alert
from flask import g
from app.utils.db_transaction import execute_transaction

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# Smart unit mapping: item name keywords → context-aware units
# ------------------------------------------------------------------

# Countable / portioned items → "pieces"
COUNTABLE_ITEMS = [
    'sandwich', 'sandwiches', 'burger', 'burgers', 'roti', 'rotis',
    'naan', 'paratha', 'parathas', 'dosa', 'idli', 'vada',
    'samosa', 'samosas', 'pakora', 'pakoras', 'roll', 'rolls',
    'wrap', 'wraps', 'cake', 'pastry', 'cookie', 'cookies',
    'muffin', 'pie', 'pizza', 'slice', 'toast',
]

# Hot beverages → "cups"
CUP_ITEMS = ['tea', 'coffee', 'cappuccino', 'espresso', 'latte', 'hot chocolate', 'cocoa']

# Cold / pourable liquids → "litres"
LIQUID_ITEMS = [
    'juice', 'soup', 'milk', 'water', 'lassi', 'buttermilk',
    'shake', 'smoothie', 'drink', 'beverage', 'mojito', 'lemonade',
    'sharbat', 'chaas', 'soda', 'coke',
]

# Bulk solids → "kg"
KG_ITEMS = [
    'rice', 'dal', 'curry', 'sabzi', 'biryani', 'pulao', 'khichdi',
    'paneer', 'chicken', 'mutton', 'fish', 'egg', 'salad', 'fries',
    'pasta', 'noodles', 'manchurian', 'chole', 'rajma', 'halwa',
    'kheer',
]


def get_unit_for_item(item_name):
    """Determine the display unit based on item name keywords."""
    name_lower = item_name.lower().strip()

    # 1. Exact / substring match in countable items
    for keyword in COUNTABLE_ITEMS:
        if keyword in name_lower:
            return "pieces"

    # 2. Hot beverages
    for keyword in CUP_ITEMS:
        if keyword in name_lower:
            return "cups"

    # 3. Liquids
    for keyword in LIQUID_ITEMS:
        if keyword in name_lower:
            return "litres"

    # 4. Bulk solids
    for keyword in KG_ITEMS:
        if keyword in name_lower:
            return "kg"

    # 5. Default — safe generic
    return "units"


def get_food_items():
    """
    Returns distinct item_name values from food_data table.
    Used for dropdown population.
    """
    try:
        results = db.session.query(FoodData.item_name).filter_by(user_id=g.current_user.id).distinct().all()
        items = [{"item_name": r[0]} for r in results]
        logger.info("Fetched %d distinct food items from food_data", len(items))
        print("Fetched distinct items:", items)
        return items
    except Exception as e:
        logger.error("Error fetching food items: %s", e)
        print("ERROR fetching food items:", str(e))
        return []


def generate_prediction(item_name, day_of_week=None, target_date_str=None):
    """
    Generates prediction based on item_name and day_of_week.
    
    Logic:
    - Query AVG(sold_qty) for item_name + day_of_week
    - If no data for that combo, fall back to item_name only
    - If no data at all, return "Not enough data"
    
    recommended_qty = predicted_demand * 1.1 (10% buffer)
    """
    # Determine target date
    if target_date_str:
        target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
    else:
        target_date = (datetime.utcnow() + timedelta(days=1)).date()

    # If day_of_week not provided, derive from target_date
    if not day_of_week:
        day_of_week = target_date.strftime('%A')

    logger.info("Prediction request: item=%s, day=%s, date=%s", item_name, day_of_week, target_date)
    print("Prediction request: item=%s, day=%s, date=%s" % (item_name, day_of_week, target_date))

    # Get unit for this item
    unit = get_unit_for_item(item_name)

    # 1. Try prediction with item_name + day_of_week
    history_day = FoodData.query.filter_by(item_name=item_name, day_of_week=day_of_week, user_id=g.current_user.id).all()
    
    # 2. Fallback: all history for item_name (any day)
    history_all = FoodData.query.filter_by(item_name=item_name, user_id=g.current_user.id).all()

    if len(history_all) == 0:
        # No data at all for this item
        logger.info("No historical data for item: %s", item_name)
        return {
            "prediction": {
                "item_name": item_name,
                "day_of_week": day_of_week,
                "date": target_date.isoformat(),
                "predicted_demand": 0,
                "recommended_qty": 0,
                "confidence_score": 0,
                "unit": unit
            },
            "alerts": [],
            "message": "Not enough data for this item. Add more entries to get accurate predictions."
        }

    # Calculate averages
    if len(history_day) >= 1:
        # Have day-specific data
        total_sold_day = sum([float(h.sold_qty) for h in history_day])
        avg_demand = total_sold_day / len(history_day)
        data_points = len(history_day)
        
        # Confidence based on data points
        confidence = min(95, 50 + data_points * 10)
        explanation_source = f"Based on {data_points} records for {item_name} on {day_of_week}s."
    else:
        # Fall back to all-days average
        total_sold_all = sum([float(h.sold_qty) for h in history_all])
        avg_demand = total_sold_all / len(history_all)
        data_points = len(history_all)
        
        # Lower confidence since not day-specific
        confidence = min(75, 30 + data_points * 8)
        explanation_source = f"Based on {data_points} records for {item_name} (no {day_of_week}-specific data yet)."

    predicted_demand = round(avg_demand, 1)
    recommended_qty = round(predicted_demand * 1.1, 1)  # 10% buffer

    logger.info("Prediction result: demand=%.1f, recommended=%.1f, confidence=%d", 
                predicted_demand, recommended_qty, confidence)

    # 3. Store/update prediction record
    try:
        existing_pred = Prediction.query.filter_by(item_name=item_name, date=target_date, user_id=g.current_user.id).first()
        if not existing_pred:
            pred = Prediction(
                date=target_date,
                item_name=item_name,
                predicted_demand=predicted_demand,
                recommended_qty=recommended_qty,
                confidence_score=confidence,
                user_id=g.current_user.id
            )
            execute_transaction(pred)
            ret_pred = pred
        else:
            existing_pred.predicted_demand = predicted_demand
            existing_pred.recommended_qty = recommended_qty
            existing_pred.confidence_score = confidence
            db.session.commit()
            ret_pred = existing_pred
    except Exception as e:
        logger.error("Error storing prediction: %s", e)
        print("ERROR storing prediction:", str(e))
        # Return prediction even if storage fails
        return {
            "prediction": {
                "item_name": item_name,
                "day_of_week": day_of_week,
                "date": target_date.isoformat(),
                "predicted_demand": predicted_demand,
                "recommended_qty": recommended_qty,
                "confidence_score": confidence,
                "unit": unit
            },
            "alerts": [],
            "message": explanation_source
        }

    # 4. Build alert message
    alert_message = "Normal demand expected."
    
    # Check if demand is higher than overall average
    total_sold_all = sum([float(h.sold_qty) for h in history_all])
    overall_avg = total_sold_all / len(history_all) if len(history_all) > 0 else predicted_demand
    
    if predicted_demand > overall_avg * 1.15:
        alert_message = f"Higher than average demand expected on {day_of_week}s. Consider preparing extra."
    elif predicted_demand < overall_avg * 0.85:
        alert_message = f"Lower demand expected on {day_of_week}s. Consider reducing preparation to minimize waste."
    
    # Fetch existing alerts for context
    try:
        item_alerts = Alert.query.filter_by(item_name=item_name, date=target_date, user_id=g.current_user.id).all()
        all_alerts = [a.to_dict() for a in item_alerts]
    except Exception:
        all_alerts = []

    pred_dict = ret_pred.to_dict()
    pred_dict["unit"] = unit
    pred_dict["day_of_week"] = day_of_week

    return {
        "prediction": pred_dict,
        "alerts": all_alerts,
        "message": explanation_source,
        "alert_message": alert_message
    }
