-- Proof that a merchant accepted the Terms of Use and took notice of the Privacy Policy (docs/legal/README.md).
-- One row per acceptance: accepting a newer version adds a row and keeps the earlier ones as history.
-- Versions are the dates printed on the texts in frontend/src/legal. No IP address or user agent is kept here
-- (data minimisation): access logs are a separate obligation (Marco Civil da Internet, art. 15).
CREATE TABLE legal_acceptances (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    terms_version VARCHAR(20) NOT NULL,
    privacy_version VARCHAR(20) NOT NULL,
    origin VARCHAR(10) NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT ck_legal_acceptances_origin CHECK (origin IN ('SIGNUP', 'IN_APP'))
);

CREATE INDEX idx_legal_acceptances_user ON legal_acceptances (user_id, accepted_at DESC);
