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
    role VARCHAR(50) NOT NULL DEFAULT 'canteen' CHECK (role IN ('admin', 'canteen', 'ngo')),
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

-- 7. ngos
CREATE TABLE IF NOT EXISTS ngos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
    ngo_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    base_lat NUMERIC(9, 6) NOT NULL,
    base_lng NUMERIC(9, 6) NOT NULL,
    address VARCHAR(255),
    service_radius_km NUMERIC(6, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ngos_user_id ON ngos (user_id);

-- 8. donation_listings
CREATE TABLE IF NOT EXISTS donation_listings (
    id VARCHAR(36) PRIMARY KEY,
    canteen_id INTEGER NOT NULL REFERENCES users(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity >= 0),
    unit VARCHAR(30) NOT NULL DEFAULT 'units',
    waste_context VARCHAR(50),
    pickup_start TIMESTAMPTZ,
    pickup_end TIMESTAMPTZ,
    lat NUMERIC(9, 6),
    lng NUMERIC(9, 6),
    address VARCHAR(255),
    expires_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'available', 'notified', 'accepted', 'pickup_scheduled', 'completed', 'expired', 'cancelled_by_system'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_donation_listings_canteen_id ON donation_listings (canteen_id);
CREATE INDEX IF NOT EXISTS idx_donation_listings_user_id ON donation_listings (user_id);
CREATE INDEX IF NOT EXISTS idx_donation_listings_status ON donation_listings (status);
CREATE INDEX IF NOT EXISTS idx_donation_listings_expires_at ON donation_listings (expires_at);

-- 9. donation_acceptances
CREATE TABLE IF NOT EXISTS donation_acceptances (
    id SERIAL PRIMARY KEY,
    donation_id VARCHAR(36) UNIQUE NOT NULL REFERENCES donation_listings(id),
    ngo_id INTEGER NOT NULL REFERENCES ngos(id),
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pickup_eta TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'pickup_scheduled', 'completed', 'cancelled', 'expired')),
    completion_timestamp TIMESTAMPTZ,
    idempotency_key VARCHAR(64)
);
CREATE INDEX IF NOT EXISTS idx_donation_acceptances_ngo_id ON donation_acceptances (ngo_id);
CREATE INDEX IF NOT EXISTS idx_donation_acceptances_idempotency_key ON donation_acceptances (idempotency_key);

-- 10. donation_notifications
CREATE TABLE IF NOT EXISTS donation_notifications (
    id SERIAL PRIMARY KEY,
    donation_id VARCHAR(36) NOT NULL REFERENCES donation_listings(id),
    ngo_id INTEGER NOT NULL REFERENCES ngos(id),
    notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    channel VARCHAR(50) NOT NULL DEFAULT 'sse',
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('pending', 'sent', 'failed')),
    read_status BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_donation_notifications_donation_id ON donation_notifications (donation_id);
CREATE INDEX IF NOT EXISTS idx_donation_notifications_ngo_id ON donation_notifications (ngo_id);

-- 11. donation_audit_logs
CREATE TABLE IF NOT EXISTS donation_audit_logs (
    id SERIAL PRIMARY KEY,
    donation_id VARCHAR(36) NOT NULL REFERENCES donation_listings(id),
    actor_user_id INTEGER REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_donation_audit_logs_donation_id ON donation_audit_logs (donation_id);
CREATE INDEX IF NOT EXISTS idx_donation_audit_logs_actor_user_id ON donation_audit_logs (actor_user_id);
