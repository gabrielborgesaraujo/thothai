-- Login com LinkedIn e vínculo de conta validado por e-mail (Fase 2).

-- Identidade do LinkedIn (sub do OpenID Connect) vinculada à conta — única entre as contas.
ALTER TABLE users
    ADD COLUMN linkedin_sub VARCHAR(64);

CREATE UNIQUE INDEX ux_users_linkedin_sub ON users (linkedin_sub) WHERE linkedin_sub IS NOT NULL;

-- Token de confirmação do vínculo (uso único, validade curta). Como no reset de senha, só o
-- hash é persistido; o token em claro viaja apenas no e-mail. Carrega o sub a ser vinculado.
CREATE TABLE linkedin_link_tokens (
    id            UUID PRIMARY KEY,
    user_id       UUID        NOT NULL,
    linkedin_sub  VARCHAR(64) NOT NULL,
    linkedin_name VARCHAR(255),
    token_hash    VARCHAR(64) NOT NULL,
    expires_at    TIMESTAMPTZ NOT NULL,
    used_at       TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_linkedin_link_tokens_hash ON linkedin_link_tokens (token_hash);
