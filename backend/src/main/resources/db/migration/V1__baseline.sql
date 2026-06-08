-- Baseline do schema ThothAI (MVP).
-- Convenções: nomes em snake_case no plural; toda tabela carrega tenant_id (RNF03 — multi-tenant
-- adormecido) e timestamps de auditoria (created_at/updated_at).

-- Administrador(es) do painel (RF01). No MVP existe um único admin por tenant.
CREATE TABLE admin_users (
    id            UUID PRIMARY KEY,
    tenant_id     VARCHAR(64)  NOT NULL,
    username      VARCHAR(128) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL,
    updated_at    TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_admin_users_tenant_username UNIQUE (tenant_id, username)
);

-- Postagens: artigos, tutoriais e notas (RF02). Corpo em Markdown.
CREATE TABLE posts (
    id           UUID PRIMARY KEY,
    tenant_id    VARCHAR(64)  NOT NULL,
    title        VARCHAR(255) NOT NULL,
    slug         VARCHAR(255) NOT NULL,
    type         VARCHAR(32)  NOT NULL,
    status       VARCHAR(16)  NOT NULL,
    summary      VARCHAR(500),
    body         TEXT         NOT NULL,
    published_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL,
    updated_at   TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_posts_tenant_slug UNIQUE (tenant_id, slug)
);

-- Listagem pública cronológica reversa de publicados (RF06).
CREATE INDEX idx_posts_tenant_status_published
    ON posts (tenant_id, status, published_at DESC);

-- Mídias incorporadas, persistidas no MinIO (RF03 / RNF01).
CREATE TABLE media_assets (
    id                UUID PRIMARY KEY,
    tenant_id         VARCHAR(64)  NOT NULL,
    object_key        VARCHAR(512) NOT NULL,
    public_url        VARCHAR(1024) NOT NULL,
    content_type      VARCHAR(128) NOT NULL,
    size_bytes        BIGINT       NOT NULL,
    original_filename VARCHAR(255),
    created_at        TIMESTAMPTZ  NOT NULL,
    updated_at        TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_media_assets_tenant_object UNIQUE (tenant_id, object_key)
);

-- Cartão de identidade do publicador (RF07). Um perfil por tenant.
CREATE TABLE profiles (
    id           UUID PRIMARY KEY,
    tenant_id    VARCHAR(64)  NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    headline     VARCHAR(255),
    bio          TEXT,
    photo_url    VARCHAR(1024),
    linkedin_url VARCHAR(512),
    email        VARCHAR(255),
    created_at   TIMESTAMPTZ  NOT NULL,
    updated_at   TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_profiles_tenant UNIQUE (tenant_id)
);

-- Portfólio curricular: experiências, formação e skills, com visibilidade seletiva (RF08).
CREATE TABLE portfolio_entries (
    id            UUID PRIMARY KEY,
    tenant_id     VARCHAR(64)  NOT NULL,
    category      VARCHAR(32)  NOT NULL,
    title         VARCHAR(255) NOT NULL,
    organization  VARCHAR(255),
    description   TEXT,
    start_date    DATE,
    end_date      DATE,
    visible       BOOLEAN      NOT NULL DEFAULT TRUE,
    display_order INTEGER      NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL,
    updated_at    TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_portfolio_entries_tenant_visible
    ON portfolio_entries (tenant_id, category, visible, display_order);
