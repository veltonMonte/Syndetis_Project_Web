-- Purchase code shown to the buyer once the payment is confirmed (see OrderCode.kt).
ALTER TABLE orders ADD COLUMN public_code VARCHAR(8);

-- Existing orders get a random code from the same alphabet (hex digits are a subset of it).
UPDATE orders SET public_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE public_code IS NULL;

ALTER TABLE orders ALTER COLUMN public_code SET NOT NULL;
CREATE UNIQUE INDEX uk_orders_public_code ON orders(public_code);
