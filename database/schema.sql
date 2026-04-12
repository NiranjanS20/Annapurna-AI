-- ============================================================
-- AI Food Waste Management — Database Schema (PostgreSQL)
-- ============================================================

-- 1. users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    full_name VARCHAR(255),
    business_name VARCHAR(255),
    business_type VARCHAR(100),
    location VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'chef')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users (firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- 2. menu_items
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_menu_items_name ON menu_items (item_name);

-- 3. food_data (daily logs)
CREATE TABLE IF NOT EXISTS food_data (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    day_of_week VARCHAR(15) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    meal_type VARCHAR(50) NOT NULL,
    prepared_qty NUMERIC(10, 2) NOT NULL CHECK (prepared_qty >= 0),
    sold_qty NUMERIC(10, 2) NOT NULL CHECK (sold_qty >= 0),
    waste_qty NUMERIC(10, 2) NOT NULL CHECK (waste_qty >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_food_data_date ON food_data (date);
CREATE INDEX IF NOT EXISTS idx_food_data_item_name ON food_data (item_name);

-- 4. predictions
CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    predicted_demand NUMERIC(10, 2) NOT NULL CHECK (predicted_demand >= 0),
    recommended_qty NUMERIC(10, 2) NOT NULL CHECK (recommended_qty >= 0),
    confidence_score NUMERIC(5, 2) CHECK (confidence_score BETWEEN 0 AND 100)
);
CREATE INDEX IF NOT EXISTS idx_predictions_date ON predictions (date);
CREATE INDEX IF NOT EXISTS idx_predictions_item_name ON predictions (item_name);

-- 5. alerts
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    item_name VARCHAR(255),
    alert_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('high', 'medium', 'low'))
);
CREATE INDEX IF NOT EXISTS idx_alerts_date ON alerts (date);

-- 6. donations
CREATE TABLE IF NOT EXISTS donations (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'picked'))
);
