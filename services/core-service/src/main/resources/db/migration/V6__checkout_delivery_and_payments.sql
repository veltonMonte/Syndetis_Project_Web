ALTER TABLE stores
    ADD COLUMN shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
    ADD COLUMN delivery_instructions VARCHAR(1000) NOT NULL DEFAULT 'Entrega a combinar com o vendedor.';

ALTER TABLE orders
    ADD COLUMN delivery_address TEXT,
    ADD COLUMN delivery_instructions VARCHAR(1000) NOT NULL DEFAULT 'Entrega a combinar com o vendedor.',
    ADD COLUMN checkout_request_id UUID,
    ADD COLUMN checkout_started_at TIMESTAMPTZ,
    ADD COLUMN preference_id VARCHAR(200),
    ADD COLUMN checkout_url TEXT,
    ADD COLUMN payment_review_required BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE payment_receipts (
    payment_id VARCHAR(100) PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id),
    status VARCHAR(40) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_receipts_order ON payment_receipts(order_id);
