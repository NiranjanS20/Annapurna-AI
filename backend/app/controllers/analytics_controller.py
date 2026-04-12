"""
Analytics & Dashboard controller.
Returns aggregated data for both Dashboard and Analytics pages.
"""

import logging
from datetime import datetime, timedelta
from app import db
from flask import g
from app.models.food_data import FoodData
from app.models.donation import Donation

logger = logging.getLogger(__name__)


def get_dashboard_data():
    """
    Returns trends, waste stats, top items, donation stats.
    """
    logs = FoodData.query.filter_by(user_id=g.current_user.id).all()
    logger.info("Dashboard query returned %d food_data rows", len(logs))
    print("Dashboard query returned", len(logs), "food_data rows")

    if len(logs) == 0:
        return {"isEmpty": True}

    total_waste = sum([float(log.waste_qty) for log in logs])
    total_prepared = sum([float(log.prepared_qty) for log in logs])
    total_sold = sum([float(log.sold_qty) for log in logs])
    waste_percentage = (total_waste / total_prepared * 100) if total_prepared > 0 else 0

    # Count unique dates for analytics threshold check
    unique_dates = len(set([log.date for log in logs]))

    # --- Trends by date (waste over time) ---
    trends = {}
    for log in logs:
        ds = log.date.isoformat()
        if ds not in trends:
            trends[ds] = 0
        trends[ds] += float(log.waste_qty)

    trend_list = [{"date": k, "waste": v} for k, v in sorted(trends.items())]

    # --- Top items by waste ---
    item_waste = {}
    for log in logs:
        item = log.item_name
        if item not in item_waste:
            item_waste[item] = 0
        item_waste[item] += float(log.waste_qty)

    top_items = [{"item_name": k, "waste": v} for k, v in sorted(item_waste.items(), key=lambda x: x[1], reverse=True)]

    # --- Demand trend (for Analytics page: demand vs prepared by date) ---
    date_agg = {}
    for log in logs:
        ds = log.date.isoformat()
        if ds not in date_agg:
            date_agg[ds] = {"demand": 0, "prepared": 0, "waste": 0}
        date_agg[ds]["demand"] += float(log.sold_qty)
        date_agg[ds]["prepared"] += float(log.prepared_qty)
        date_agg[ds]["waste"] += float(log.waste_qty)

    demand_trend = [
        {"date": k, "demand": round(v["demand"], 2), "prepared": round(v["prepared"], 2)}
        for k, v in sorted(date_agg.items())
    ]

    # --- Waste by item (for Analytics page) ---
    waste_by_item = [
        {"item": k, "waste": round(v, 2)}
        for k, v in sorted(item_waste.items(), key=lambda x: x[1], reverse=True)
    ][:10]

    # --- Donation stats ---
    try:
        donations = Donation.query.filter_by(user_id=g.current_user.id).all()
        total_donated = sum([float(d.quantity) for d in donations])
        donation_count = len(donations)
    except Exception as e:
        logger.error("Error fetching donation stats: %s", e)
        total_donated = 0
        donation_count = 0

    result = {
        "isEmpty": False,
        "record_count": len(logs),
        "unique_dates": unique_dates,
        "wasteStats": {
            "total_waste": round(total_waste, 2),
            "total_prepared": round(total_prepared, 2),
            "total_sold": round(total_sold, 2),
            "waste_percentage": round(waste_percentage, 1)
        },
        "trends": trend_list[-7:],       # Last 7 data points for Dashboard
        "topItems": top_items[:5],
        "demandTrend": demand_trend[-7:], # Last 7 data points for Analytics
        "wasteByItem": waste_by_item,
        "donationStats": {
            "totalDonated": round(total_donated, 2),
            "donationCount": donation_count
        }
    }

    logger.info("Dashboard result: isEmpty=%s, records=%d, unique_dates=%d", 
                result["isEmpty"], result["record_count"], result["unique_dates"])
    return result
