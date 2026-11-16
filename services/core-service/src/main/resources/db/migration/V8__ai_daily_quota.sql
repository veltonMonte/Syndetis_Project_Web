CREATE TABLE ai_request_usage (
    store_id UUID NOT NULL REFERENCES stores(id),
    request_id UUID NOT NULL,
    operation VARCHAR(30) NOT NULL CHECK (operation IN ('LAYOUT_EDIT', 'IMAGE_GENERATION')),
    quota_date DATE NOT NULL,
    state VARCHAR(20) NOT NULL CHECK (state IN ('RESERVED', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    PRIMARY KEY (store_id, request_id)
);
CREATE INDEX idx_ai_usage_store_day ON ai_request_usage(store_id, quota_date);
