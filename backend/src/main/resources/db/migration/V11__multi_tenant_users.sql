-- Fase 2 (multi-tenant): admin_users vira a tabela geral de usuários da plataforma, com papel
-- (SYSTEM_ADMIN gere a plataforma; PUBLISHER gere o próprio conteúdo), status do cadastro
-- (auto-registro entra como PENDING até a aprovação) e handle público (URL /handle).
ALTER TABLE admin_users RENAME TO users;
ALTER TABLE users RENAME CONSTRAINT uq_admin_users_tenant_username TO uq_users_tenant_username;

ALTER TABLE users ADD COLUMN role   VARCHAR(32) NOT NULL DEFAULT 'PUBLISHER';
ALTER TABLE users ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE users ADD COLUMN handle VARCHAR(64);

-- O administrador único do MVP vira o administrador do sistema (e segue publicador do
-- tenant 'default'), com handle derivado do username.
UPDATE users SET role = 'SYSTEM_ADMIN', handle = lower(username);

ALTER TABLE users ALTER COLUMN handle SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT uq_users_handle UNIQUE (handle);
-- O login passa a ser global (sem tenant na credencial).
ALTER TABLE users ADD CONSTRAINT uq_users_username UNIQUE (username);

-- Integração macro: as credenciais do app LinkedIn saem da conexão por tenant e passam a ser
-- únicas da plataforma, geridas pelo administrador do sistema.
CREATE TABLE linkedin_app_settings (
    id            UUID PRIMARY KEY,
    client_id     VARCHAR(255),
    client_secret VARCHAR(255),
    created_at    TIMESTAMPTZ NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL
);

INSERT INTO linkedin_app_settings (id, client_id, client_secret, created_at, updated_at)
SELECT gen_random_uuid(), client_id, client_secret, now(), now()
FROM linkedin_connections
WHERE client_id IS NOT NULL
LIMIT 1;

ALTER TABLE linkedin_connections DROP COLUMN client_id;
ALTER TABLE linkedin_connections DROP COLUMN client_secret;
