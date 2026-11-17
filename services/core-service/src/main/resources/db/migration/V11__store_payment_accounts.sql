-- Each store charges into the merchant's own Mercado Pago account, connected through OAuth: the merchant never
-- copies an API key. Tokens are encrypted by the application (AES-256-GCM) before they reach this table.
-- (V10 is reserved by the store media work.)
CREATE TABLE store_payment_accounts (
    store_id UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL DEFAULT 'MERCADO_PAGO' CHECK (provider = 'MERCADO_PAGO'),
    provider_user_id VARCHAR(30) NOT NULL,
    nickname VARCHAR(80),
    access_token_enc TEXT NOT NULL,
    refresh_token_enc TEXT NOT NULL,
    public_key VARCHAR(200),
    live_mode BOOLEAN NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One authorization attempt: single use, ten minutes, bound to the store and the merchant who started it.
-- Only the SHA-256 of the state is kept; the PKCE verifier is encrypted like the tokens.
CREATE TABLE payment_oauth_states (
    state_hash CHAR(64) PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    code_verifier_enc TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_payment_oauth_states_expiry ON payment_oauth_states(expires_at);
