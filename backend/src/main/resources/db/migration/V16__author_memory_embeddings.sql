-- Memória de publicações (RAG): config de embeddings dedicada + vetores por publicação.

-- Configuração dedicada de embeddings (independente do texto e da imagem).
ALTER TABLE ai_settings
    ADD COLUMN embedding_provider VARCHAR(32),
    ADD COLUMN embedding_api_key  VARCHAR(255),
    ADD COLUMN embedding_model    VARCHAR(128),
    ADD COLUMN embedding_base_url VARCHAR(512);

-- Embedding de cada publicação (um por post). O vetor é guardado como JSON de floats; a
-- similaridade de cosseno é calculada na aplicação (volume por usuário é pequeno). `source_hash`
-- detecta quando o texto mudou e o embedding precisa ser refeito.
CREATE TABLE post_embeddings (
    id          UUID PRIMARY KEY,
    tenant_id   VARCHAR(64)  NOT NULL,
    post_id     UUID         NOT NULL,
    source_hash VARCHAR(64)  NOT NULL,
    model       VARCHAR(128) NOT NULL,
    embedding   TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL,
    CONSTRAINT ux_post_embeddings_post UNIQUE (post_id)
);

CREATE INDEX ix_post_embeddings_tenant ON post_embeddings (tenant_id);
