-- Conexão do LinkedIn por tenant: credenciais do app (criado pelo usuário no portal de
-- desenvolvedores do LinkedIn) + token OAuth do membro para publicar em nome dele.
CREATE TABLE linkedin_connections (
    id               UUID PRIMARY KEY,
    tenant_id        VARCHAR(64)   NOT NULL,
    client_id        VARCHAR(255),
    client_secret    VARCHAR(255),
    access_token     VARCHAR(2048),
    token_expires_at TIMESTAMPTZ,
    member_urn       VARCHAR(128),
    member_name      VARCHAR(255),
    oauth_state      VARCHAR(64),
    created_at       TIMESTAMPTZ   NOT NULL,
    updated_at       TIMESTAMPTZ   NOT NULL,
    CONSTRAINT uq_linkedin_connections_tenant UNIQUE (tenant_id)
);
