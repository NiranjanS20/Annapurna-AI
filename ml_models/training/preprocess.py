"""
Data Preprocessing Pipeline.
Reads raw CSV data files, merges them, engineers features, and outputs a
processed dataset ready for model training.

Data sources:
  - data/train.csv              → historical orders per (week, center, meal)
  - data/meal_info.csv          → meal category & cuisine
  - data/fulfilment_center_info.csv → center type & operational area

Output:
  - data/processed_data.csv     → cleaned, feature-engineered dataset
"""

import os
import logging
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# Resolve paths relative to the ml_models/ root
ML_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ML_ROOT, 'data')


def load_raw_data():
    """Load and merge the three raw CSV files."""
    train_path = os.path.join(DATA_DIR, 'train.csv')
    meal_path = os.path.join(DATA_DIR, 'meal_info.csv')
    center_path = os.path.join(DATA_DIR, 'fulfilment_center_info.csv')

    for p in [train_path, meal_path, center_path]:
        if not os.path.exists(p):
            raise FileNotFoundError(f'Required data file not found: {p}')

    train = pd.read_csv(train_path)
    meals = pd.read_csv(meal_path)
    centers = pd.read_csv(center_path)

    logger.info('Loaded train.csv: %s rows, %s cols', *train.shape)
    logger.info('Loaded meal_info.csv: %s rows', len(meals))
    logger.info('Loaded fulfilment_center_info.csv: %s rows', len(centers))

    # Merge
    df = train.merge(meals, on='meal_id', how='left')
    df = df.merge(centers, on='center_id', how='left')
    logger.info('Merged dataset: %s rows, %s cols', *df.shape)

    return df


def engineer_features(df):
    """
    Create features compatible with the backend ML service.
    The backend prediction pipeline expects:
      [day_of_week, is_weekend, lag_1_demand, lag_3_avg, meal_type]

    Mapping from the dataset:
      - week (1-145) → synthetic day_of_week (week % 7)
      - is_weekend   → 1 if day_of_week >= 5
      - lag features  → computed from num_orders grouped by (center_id, meal_id)
      - meal_type    → encoded from category
      - target       → num_orders
    """
    # ---- Day features from week number ----
    df['day_of_week'] = df['week'] % 7  # synthetic day-of-week mapping
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)

    # ---- Meal type encoding ----
    # Map category to a numeric meal_type for the model
    category_map = {
        'Beverages': 0,
        'Rice Bowl': 1,
        'Starters': 2,
        'Pasta': 3,
        'Sandwich': 4,
        'Salad': 5,
        'Pizza': 6,
        'Extras': 7,
        'Seafood': 8,
        'Biryani': 9,
        'Desert': 10,
        'Soup': 11,
        'Fish': 12,
        'Other Snacks': 13,
    }
    df['meal_type'] = df['category'].map(category_map).fillna(len(category_map)).astype(int)

    # ---- Lag features ----
    # Sort by center, meal, week for proper lag computation
    df = df.sort_values(['center_id', 'meal_id', 'week']).reset_index(drop=True)

    # Group by (center_id, meal_id) and compute lag features
    grouped = df.groupby(['center_id', 'meal_id'])['num_orders']
    df['lag_1_demand'] = grouped.shift(1)
    df['lag_2_demand'] = grouped.shift(2)
    df['lag_3_demand'] = grouped.shift(3)
    df['lag_3_avg'] = df[['lag_1_demand', 'lag_2_demand', 'lag_3_demand']].mean(axis=1)

    # ---- Price features (bonus — improves accuracy) ----
    df['price_ratio'] = df['checkout_price'] / df['base_price'].replace(0, 1)
    df['discount'] = (df['base_price'] - df['checkout_price']).clip(lower=0)

    # ---- Drop rows without sufficient history for lag computation ----
    before = len(df)
    df = df.dropna(subset=['lag_1_demand', 'lag_3_avg']).reset_index(drop=True)
    logger.info('Dropped %d rows without lag history (%d → %d)', before - len(df), before, len(df))

    # ---- Select final feature columns + target ----
    feature_cols = [
        'day_of_week',
        'is_weekend',
        'lag_1_demand',
        'lag_3_avg',
        'meal_type',
        # Bonus features that improve accuracy
        'checkout_price',
        'emailer_for_promotion',
        'homepage_featured',
        'price_ratio',
        'discount',
    ]

    target_col = 'num_orders'

    # Keep metadata columns for reference
    meta_cols = ['week', 'center_id', 'meal_id', 'category', 'cuisine']

    output_cols = meta_cols + feature_cols + [target_col]
    df_out = df[output_cols].copy()

    logger.info('Feature engineering complete. Final shape: %s', df_out.shape)
    logger.info('Features: %s', feature_cols)
    logger.info('Target: %s', target_col)

    return df_out, feature_cols, target_col


def run_preprocessing():
    """Full preprocessing pipeline. Returns the processed DataFrame."""
    logger.info('=== Starting preprocessing pipeline ===')

    df = load_raw_data()
    df_processed, feature_cols, target_col = engineer_features(df)

    # Save processed data
    output_path = os.path.join(DATA_DIR, 'processed_data.csv')
    df_processed.to_csv(output_path, index=False)
    logger.info('Saved processed data to %s', output_path)

    # Print summary stats
    logger.info('--- Dataset Summary ---')
    logger.info('  Rows: %d', len(df_processed))
    logger.info('  Target mean: %.1f', df_processed[target_col].mean())
    logger.info('  Target std:  %.1f', df_processed[target_col].std())
    logger.info('  Target range: %.0f – %.0f', df_processed[target_col].min(), df_processed[target_col].max())

    return df_processed, feature_cols, target_col


if __name__ == '__main__':
    run_preprocessing()
