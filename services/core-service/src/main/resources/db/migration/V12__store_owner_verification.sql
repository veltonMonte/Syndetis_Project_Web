-- "Verificado Syndetis": the store's owner has a CNPJ the Receita Federal confirmed as active. The auth-service owns
-- that fact; the core-service keeps a copy per store, taken from the owner's signed token (ADR 0007).
-- (V10 is reserved by the store media work.)
ALTER TABLE stores
    ADD COLUMN owner_verified BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN owner_verified_at TIMESTAMP WITH TIME ZONE;
