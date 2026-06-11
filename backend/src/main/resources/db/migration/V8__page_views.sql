-- Métricas de acesso do portal: contagem agregada por dia e por caminho (home, listagem e
-- páginas de leitura). Alimentada por um beacon público; consultada pelo dashboard do admin.
CREATE TABLE page_views (
    id         UUID PRIMARY KEY,
    tenant_id  VARCHAR(64)  NOT NULL,
    view_date  DATE         NOT NULL,
    path       VARCHAR(160) NOT NULL,
    views      BIGINT       NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL,
    updated_at TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_page_views_tenant_date_path UNIQUE (tenant_id, view_date, path)
);

CREATE INDEX idx_page_views_tenant_date ON page_views (tenant_id, view_date);
