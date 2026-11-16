CREATE TABLE inventory (
    product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved INTEGER NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_inventory_nonnegative CHECK (reserved >= 0 AND quantity >= reserved)
);

INSERT INTO inventory (product_id)
SELECT id FROM products;

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('IN', 'OUT', 'RESERVE', 'RELEASE', 'ADJUST')),
    quantity_delta INTEGER NOT NULL DEFAULT 0,
    reserved_delta INTEGER NOT NULL DEFAULT 0,
    reason VARCHAR(500) NOT NULL,
    order_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_stock_movement_nonzero CHECK (quantity_delta <> 0 OR reserved_delta <> 0)
);

CREATE INDEX idx_stock_movements_product_created ON stock_movements(product_id, created_at DESC);
CREATE INDEX idx_stock_movements_order ON stock_movements(order_id) WHERE order_id IS NOT NULL;
