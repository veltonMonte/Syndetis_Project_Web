CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
    CONSTRAINT uk_categories_store_slug UNIQUE (store_id, slug),
    CONSTRAINT uk_categories_store_id UNIQUE (store_id, id)
);

CREATE INDEX idx_categories_store_position ON categories(store_id, position, id);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category_id UUID,
    name VARCHAR(160) NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    sku VARCHAR(100) NOT NULL,
    image_url VARCHAR(2048),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uk_products_store_sku UNIQUE (store_id, sku),
    CONSTRAINT fk_products_category_same_store FOREIGN KEY (store_id, category_id)
        REFERENCES categories(store_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_products_store_active ON products(store_id, active, created_at DESC);
CREATE INDEX idx_products_category ON products(category_id);
