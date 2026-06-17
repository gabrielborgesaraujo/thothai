-- Histórico de prompts de IA por publicador (consulta, favoritos e filtros).
CREATE TABLE prompt_history (
    id         UUID PRIMARY KEY,
    tenant_id  VARCHAR(64)  NOT NULL,
    type       VARCHAR(16)  NOT NULL,
    prompt     TEXT         NOT NULL,
    favorite   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ  NOT NULL,
    updated_at TIMESTAMPTZ  NOT NULL
);

-- Listagem por tenant, com favoritos em destaque e mais recentes primeiro.
CREATE INDEX ix_prompt_history_tenant ON prompt_history (tenant_id, favorite DESC, created_at DESC);
