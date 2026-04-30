import csv
import time
import logging
from io import StringIO
from datetime import datetime
from flask import g
from app import db
from app.models.food_data import FoodData
from app.utils.db_transaction import execute_transaction
from app.controllers.data_controller import check_alerts_and_donations

logger = logging.getLogger(__name__)

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
    "Tea": "beverage", "Masala Chai": "beverage", "Green Tea": "beverage", "Coffee": "beverage",
    "Filter Coffee": "beverage", "Cold Coffee": "beverage", "Hot Chocolate": "beverage", "Lassi": "beverage",
    "Sweet Lassi": "beverage", "Mango Lassi": "beverage", "Buttermilk": "beverage", "Chaas": "beverage",
    "Mojito": "beverage", "Fresh Lime Soda": "beverage", "Lemonade": "beverage", "Orange Juice": "beverage",
    "Watermelon Juice": "beverage", "Mixed Fruit Juice": "beverage", "Milkshake": "beverage",
    "Mango Shake": "beverage", "Chocolate Shake": "beverage", "Soda": "beverage", "Soft Drink": "beverage",
    "Water": "beverage", "Soup": "beverage", "Tomato Soup": "beverage", "Sweet Corn Soup": "beverage",
    "Manchow Soup": "beverage"
}

MAX_CSV_ROWS = 5000
MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def process_csv_upload(file):
    """
    Parses CSV and inserts rows into food_data. Row-level error handling.
    Returns stats including duration_ms for observability.
    """
    start_time = time.time()
    parsing_errors = []
    try:
        # ── File size check ──
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)     # Seek back to start
        if file_size > MAX_CSV_SIZE_BYTES:
            raise ValueError(f"CSV file exceeds maximum size of {MAX_CSV_SIZE_BYTES // (1024*1024)}MB.")

        try:
            content = file.read().decode('utf-8')
        except UnicodeDecodeError:
            file.seek(0)
            content = file.read().decode('utf-8-sig')

        if not content.strip():
            raise ValueError("CSV file is empty.")

        csv_reader = csv.DictReader(StringIO(content))
        required_cols = ['date', 'item_name', 'quantity_sold']
        headers = csv_reader.fieldnames or []
        headers = [h.strip() for h in headers]
        if headers and headers[0].startswith('\ufeff'):
            headers[0] = headers[0].replace('\ufeff', '')
        csv_reader.fieldnames = headers

        missing_cols = [c for c in required_cols if c not in headers]
        if missing_cols:
            raise ValueError(f"CSV missing required columns: {', '.join(missing_cols)}. Found: {', '.join(headers)}")

        # ── Session safety ──
        try:
            db.session.rollback()
        except Exception:
            pass

        to_insert = []
        alert_triggers = []
        rows_processed = 0
        skipped_duplicates = 0
        skipped_invalid = 0

        for row_num, row in enumerate(csv_reader, start=2):
            if rows_processed >= MAX_CSV_ROWS:
                parsing_errors.append(f"Row {row_num}: Max {MAX_CSV_ROWS} rows reached.")
                break
            if not any(row.values()):
                continue
            try:
                date_str = (row.get('date') or '').strip()
                item_name = (row.get('item_name') or '').strip().title()
                qty_raw = (row.get('quantity_sold') or '').strip()

                if not date_str or not item_name or qty_raw == '':
                    skipped_invalid += 1
                    parsing_errors.append(f"Row {row_num}: Missing required field (date, item_name, or quantity_sold).")
                    continue
                try:
                    sold_qty = float(qty_raw)
                except ValueError:
                    skipped_invalid += 1
                    parsing_errors.append(f"Row {row_num}: Invalid quantity_sold '{qty_raw}'.")
                    continue
                try:
                    log_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                except ValueError:
                    skipped_invalid += 1
                    parsing_errors.append(f"Row {row_num}: Invalid date format '{date_str}'. Expected YYYY-MM-DD.")
                    continue

                day_of_week = log_date.strftime('%A')
                raw_prepared = row.get('prepared_qty')
                if raw_prepared and raw_prepared.strip():
                    try:
                        prepared_qty = float(raw_prepared.strip())
                    except ValueError:
                        prepared_qty = sold_qty
                else:
                    prepared_qty = sold_qty

                waste_qty = max(0.0, prepared_qty - sold_qty)
                meal_type = PRESET_CATEGORIES.get(item_name, "Other")

                exists = FoodData.query.filter_by(
                    date=log_date, item_name=item_name, user_id=g.current_user.id
                ).first()
                if exists:
                    skipped_duplicates += 1
                    continue

                log = FoodData(
                    date=log_date, day_of_week=day_of_week, item_name=item_name,
                    meal_type=meal_type, prepared_qty=prepared_qty, sold_qty=sold_qty,
                    waste_qty=waste_qty, user_id=g.current_user.id
                )
                to_insert.append(log)
                alert_triggers.append((log, prepared_qty, sold_qty, waste_qty))
                rows_processed += 1
            except Exception as row_err:
                skipped_invalid += 1
                parsing_errors.append(f"Row {row_num}: Unexpected error — {str(row_err)[:80]}")
                continue

        if to_insert:
            execute_transaction(*to_insert)
            for t_log, t_prep, t_sold, t_waste in alert_triggers:
                try:
                    check_alerts_and_donations(t_log.item_name, t_log.date, t_prep, t_sold, t_waste, t_log.id)
                except Exception as e:
                    logger.error("CSV alert trigger error (non-blocking): %s", e)

        duration_ms = round((time.time() - start_time) * 1000)
        result = {
            "success": True,
            "rows_inserted": len(to_insert),
            "skipped_duplicates": skipped_duplicates,
            "skipped_invalid": skipped_invalid,
            "duration_ms": duration_ms,
        }
        if parsing_errors:
            result["parsing_errors"] = parsing_errors[:20]

        logger.info(
            "CSV upload complete: %d inserted, %d dup, %d invalid, %dms",
            len(to_insert), skipped_duplicates, skipped_invalid, duration_ms
        )
        return result

    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Error processing CSV: {e}")
        raise ValueError(f"Failed to process CSV file: {str(e)}")
