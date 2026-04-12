import csv
import logging
from io import StringIO
from datetime import datetime
from flask import g
from app.models.food_data import FoodData
from app.utils.db_transaction import execute_transaction
from app.controllers.data_controller import check_alerts_and_donations

logger = logging.getLogger(__name__)

# Minimal category mapping reflecting presetMenuItems.js logic natively
PRESET_CATEGORIES = {
    "Rice": "main", "Jeera Rice": "main", "Veg Pulao": "main", "Peas Pulao": "main", "Veg Biryani": "main",
    "Chicken Biryani": "main", "Mutton Biryani": "main", "Egg Biryani": "main", "Dal Tadka": "main",
    "Dal Makhani": "main", "Yellow Dal": "main", "Chana Dal": "main", "Paneer Butter Masala": "main",
    "Kadhai Paneer": "main", "Palak Paneer": "main", "Shahi Paneer": "main", "Chole": "main", "Rajma": "main",
    "Mixed Veg": "main", "Aloo Gobi": "main", "Bhindi Masala": "main", "Baingan Bharta": "main",
    "Malai Kofta": "main", "Butter Chicken": "main", "Chicken Tikka Masala": "main", "Fish Curry": "main",
    "Mutton Curry": "main", "Egg Curry": "main", "Upma": "breakfast", "Poha": "breakfast", "Khichdi": "main",
    "Pav Bhaji (Bhaji)": "main", "Chilli Chicken": "main", "Chilli Paneer": "main", "Veg Manchurian": "main",
    "Hakka Noodles": "main", "Fried Rice": "main", "Pasta": "main", "Macaroni": "main",
    "Roti": "bread", "Chapati": "bread", "Phulka": "bread", "Butter Naan": "bread", "Garlic Naan": "bread",
    "Plain Naan": "bread", "Tandoori Roti": "bread", "Aloo Paratha": "bread", "Paneer Paratha": "bread",
    "Gobi Paratha": "bread", "Lachha Paratha": "bread", "Puri": "bread", "Bhatura": "bread", "Pav": "bread",
    "Samosa": "snack", "Kachori": "snack", "Vada Pav": "snack", "Aloo Tikki": "snack", "Pakora": "snack",
    "Bread Pakora": "snack", "Sandwich": "snack", "Veg Sandwich": "snack", "Grilled Sandwich": "snack",
    "Burger": "snack", "Veg Burger": "snack", "Chicken Burger": "snack", "Wrap": "snack", "Roll": "snack",
    "Kathi Roll": "snack", "Spring Roll": "snack", "Puff": "snack", "Veg Puff": "snack",
    "Idli": "south", "Medu Vada": "south", "Plain Dosa": "south", "Masala Dosa": "south", "Rava Dosa": "south",
    "Uttapam": "south", "Appam": "south",
    "Gulab Jamun": "dessert", "Rasgulla": "dessert", "Jalebi": "dessert", "Ladoo": "dessert", "Barfi": "dessert",
    "Kaju Katli": "dessert", "Brownie": "dessert", "Pastry": "dessert", "Cupcake": "dessert", "Ice Cream": "dessert",
    "Tea": "beverage", "Masala Chai": "beverage", "Green Tea": "beverage", "Coffee": "beverage", "Filter Coffee": "beverage",
    "Cold Coffee": "beverage", "Hot Chocolate": "beverage", "Lassi": "beverage", "Sweet Lassi": "beverage",
    "Mango Lassi": "beverage", "Buttermilk": "beverage", "Chaas": "beverage", "Mojito": "beverage",
    "Fresh Lime Soda": "beverage", "Lemonade": "beverage", "Orange Juice": "beverage", "Watermelon Juice": "beverage",
    "Mixed Fruit Juice": "beverage", "Milkshake": "beverage", "Mango Shake": "beverage", "Chocolate Shake": "beverage",
    "Soda": "beverage", "Soft Drink": "beverage", "Water": "beverage", "Soup": "beverage", "Tomato Soup": "beverage",
    "Sweet Corn Soup": "beverage", "Manchow Soup": "beverage"
}

def process_csv_upload(file):
    """
    Parses a CSV file and inserts rows into the food_data table.
    CSV Format expected: date,item_name,quantity_sold (optional: prepared_qty)
    """
    try:
        content = file.read().decode('utf-8')
        csv_reader = csv.DictReader(StringIO(content))
        
        required_cols = ['date', 'item_name', 'quantity_sold']
        headers = csv_reader.fieldnames or []
        
        # Validate columns
        if not all(col in headers for col in required_cols):
            raise ValueError(f"CSV must contain columns: {', '.join(required_cols)}")

        to_insert = []
        alert_triggers = []
        rows_processed = 0
        skipped_duplicates = 0

        for row in csv_reader:
            # Skip completely empty rows
            if not any(row.values()):
                continue

            # 1. Normalization
            date_str = row['date'].strip()
            item_name = row['item_name'].strip().title()
            
            try:
                sold_qty = float(row['quantity_sold'].strip() or 0)
            except ValueError:
                sold_qty = 0.0
            
            # 2. Derived fields
            try:
                log_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                # If date is invalid format, skip or error out
                raise ValueError(f"Invalid date format for '{date_str}'. Expected YYYY-MM-DD.")

            day_of_week = log_date.strftime('%A')
            
            # Try extracting optional prepared_qty
            raw_prepared = row.get('prepared_qty')
            if raw_prepared and raw_prepared.strip():
                try:
                    prepared_qty = float(raw_prepared.strip())
                except ValueError:
                    prepared_qty = sold_qty
            else:
                # Fallback assumption
                prepared_qty = sold_qty

            waste_qty = max(0.0, prepared_qty - sold_qty)
            
            # Map item properly via strict categorization, defaulting safely to 'Other'
            meal_type = PRESET_CATEGORIES.get(item_name, "Other")

            # 4. Duplicate Protection
            # Check if record already exists for this date, item AND user
            exists = FoodData.query.filter_by(
                date=log_date, 
                item_name=item_name, 
                user_id=g.current_user.id
            ).first()
            if exists:
                skipped_duplicates += 1
                continue

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
            to_insert.append(log)
            # Store data to trigger alerts/donations after successful commit
            alert_triggers.append((item_name, log_date, prepared_qty, sold_qty, waste_qty))
            
            rows_processed += 1

        # 5. Insert & Trigger logic
        if to_insert:
            execute_transaction(*to_insert)
            
            # Fire business logic evaluating waste thresholds for each successful row
            for t_item_name, t_log_date, t_prepared_qty, t_sold_qty, t_waste_qty in alert_triggers:
                check_alerts_and_donations(t_item_name, t_log_date, t_prepared_qty, t_sold_qty, t_waste_qty)

        return {
            "success": True,
            "rows_inserted": len(to_insert),
            "skipped_duplicates": skipped_duplicates
        }

    except ValueError as val_err:
        raise val_err
    except Exception as e:
        logger.error(f"Error processing CSV: {e}")
        raise ValueError(f"Failed to process CSV file.")
