-- A merchant account exists only for a CPF or CNPJ the Receita Federal confirms (exists and is active).
-- A CNPJ is public company data and is kept as shown; a CPF is personal data, so only a masked form and a
-- keyed hash (HMAC-SHA256, used to stop one document from opening several accounts) are stored.
ALTER TABLE users
    ADD COLUMN document_type VARCHAR(4),
    ADD COLUMN document_hash VARCHAR(64),
    ADD COLUMN document_display VARCHAR(20),
    ADD COLUMN legal_name VARCHAR(200),
    ADD COLUMN mei BOOLEAN,
    ADD COLUMN document_verified_at TIMESTAMP WITH TIME ZONE,
    ADD CONSTRAINT ck_users_document_type CHECK (document_type IN ('CPF', 'CNPJ')),
    ADD CONSTRAINT ck_users_document_complete CHECK (
        (document_type IS NULL AND document_hash IS NULL AND document_verified_at IS NULL)
        OR (document_type IS NOT NULL AND document_hash IS NOT NULL AND document_verified_at IS NOT NULL));

CREATE UNIQUE INDEX ux_users_document_hash ON users (document_hash) WHERE document_hash IS NOT NULL;
