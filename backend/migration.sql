-- Run this against ecommerce_db, e.g.:
--   psql -U postgres -d ecommerce_db -f migration.sql
-- (it will prompt for the password: 1234, per your .env)

-- 1. New table: coupons
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR NOT NULL UNIQUE,
    discount_type VARCHAR NOT NULL,
    discount_value INTEGER NOT NULL,
    max_uses INTEGER,
    times_used INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_coupons_code ON coupons (code);

-- 2. New table: order_status_events
CREATE TABLE IF NOT EXISTS order_status_events (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    status VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. New columns on orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_minor INTEGER NOT NULL DEFAULT 0;