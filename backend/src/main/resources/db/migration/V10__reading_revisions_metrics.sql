-- Busca full-text nas publicações (título + resumo + corpo), com índice GIN.
ALTER TABLE posts ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('portuguese',
            coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(body, ''))
    ) STORED;

CREATE INDEX idx_posts_search_vector ON posts USING GIN (search_vector);

-- Registro de compartilhamento no LinkedIn (badge no painel).
ALTER TABLE posts ADD COLUMN linkedin_shared_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN linkedin_post_id   VARCHAR(128);

-- Histórico de versões: snapshot do estado anterior a cada atualização (máx. 20 por post).
CREATE TABLE post_revisions (
    id         UUID PRIMARY KEY,
    tenant_id  VARCHAR(64)  NOT NULL,
    post_id    UUID         NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL,
    summary    VARCHAR(500),
    body       TEXT         NOT NULL,
    banner_url VARCHAR(1024),
    created_at TIMESTAMPTZ  NOT NULL,
    updated_at TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_post_revisions_post ON post_revisions (post_id, created_at DESC);

-- Métricas v2: separa "acesso" (view) de "leitura" (read, rolagem até o fim do artigo).
ALTER TABLE page_views ADD COLUMN metric VARCHAR(16) NOT NULL DEFAULT 'view';
ALTER TABLE page_views DROP CONSTRAINT uq_page_views_tenant_date_path;
ALTER TABLE page_views ADD CONSTRAINT uq_page_views_tenant_date_path_metric
    UNIQUE (tenant_id, view_date, path, metric);

-- Origem do tráfego: host do referrer externo, agregado por dia.
CREATE TABLE referrer_views (
    id         UUID PRIMARY KEY,
    tenant_id  VARCHAR(64)  NOT NULL,
    view_date  DATE         NOT NULL,
    host       VARCHAR(160) NOT NULL,
    views      BIGINT       NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL,
    updated_at TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_referrer_views_tenant_date_host UNIQUE (tenant_id, view_date, host)
);
