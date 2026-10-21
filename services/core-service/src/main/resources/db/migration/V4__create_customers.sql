CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE,
    name VARCHAR(160) NOT NULL,
    email VARCHAR(320) NOT NULL,
    phone VARCHAR(30),
    document VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_email ON customers(lower(email));

CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    zip_code CHAR(8) NOT NULL,
    street VARCHAR(160) NOT NULL,
    number VARCHAR(30) NOT NULL,
    complement VARCHAR(160),
    city VARCHAR(120) NOT NULL,
    state CHAR(2) NOT NULL
);

CREATE INDEX idx_addresses_customer ON addresses(customer_id);
