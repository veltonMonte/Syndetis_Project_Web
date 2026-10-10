CREATE TABLE IF NOT EXISTS layout_config (
    store_id UUID PRIMARY KEY REFERENCES store(id) ON DELETE CASCADE,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_layout_config_store ON layout_config (store_id);
