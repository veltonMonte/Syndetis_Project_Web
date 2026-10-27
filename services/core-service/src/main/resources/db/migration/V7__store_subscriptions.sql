CREATE TABLE store_subscriptions (
    id UUID PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id),
    plan_id VARCHAR(30) NOT NULL CHECK (plan_id IN ('STANDARD', 'MAKER')),
    price NUMERIC(12,2) NOT NULL CHECK (price > 0),
    provider_id VARCHAR(110) UNIQUE,
    customer_id VARCHAR(110),
    provider_status VARCHAR(30) NOT NULL DEFAULT 'CREATING',
    paid_until TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    observed_at TIMESTAMPTZ,
    payments JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_store_created ON store_subscriptions(store_id, created_at DESC);
CREATE UNIQUE INDEX idx_subscriptions_one_open_per_store ON store_subscriptions(store_id) WHERE cancelled_at IS NULL;
