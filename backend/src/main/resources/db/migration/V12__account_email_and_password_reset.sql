-- E-mail de cadastro da conta (atualizável no painel; destino do link de redefinição de senha).
ALTER TABLE users ADD COLUMN email VARCHAR(255);
ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email);

-- Tokens de redefinição de senha: o token em si só viaja no e-mail — aqui fica apenas o hash
-- (SHA-256), com validade de 30 minutos e uso único.
CREATE TABLE password_reset_tokens (
    id         UUID PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens (token_hash);
