-- Fase 2: dois modelos de postagem e geração de imagem por IA com configuração dedicada.

-- Modelo de publicação da postagem:
--   PLATFORM  = modelo clássico (sempre no hub; LinkedIn = isca com link de volta ao portal);
--   FLEXIBLE  = modelo flexível (hub opcional via status; LinkedIn = conteúdo inteiro, sem link).
ALTER TABLE posts
    ADD COLUMN mode VARCHAR(16) NOT NULL DEFAULT 'PLATFORM';

-- Configuração dedicada de geração de imagem por IA (independente do provedor de texto).
ALTER TABLE ai_settings
    ADD COLUMN image_provider VARCHAR(32),
    ADD COLUMN image_api_key  VARCHAR(255),
    ADD COLUMN image_model    VARCHAR(128),
    ADD COLUMN image_base_url VARCHAR(512);
