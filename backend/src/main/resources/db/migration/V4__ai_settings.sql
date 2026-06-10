-- Chaves de IA configuradas pelo próprio usuário no painel (substituem as variáveis de
-- ambiente quando presentes). Uma linha por tenant (RNF03).
CREATE TABLE ai_settings (
    id                UUID PRIMARY KEY,
    tenant_id         VARCHAR(64) NOT NULL,
    anthropic_api_key VARCHAR(255),
    anthropic_model   VARCHAR(128),
    tavily_api_key    VARCHAR(255),
    created_at        TIMESTAMPTZ NOT NULL,
    updated_at        TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_ai_settings_tenant UNIQUE (tenant_id)
);
