-- Motor de IA multi-provider: as colunas específicas da Anthropic dão lugar a um conjunto
-- genérico (provider + chave + modelo + base URL). Os dados existentes são migrados.
ALTER TABLE ai_settings ADD COLUMN provider VARCHAR(32);
ALTER TABLE ai_settings ADD COLUMN api_key  VARCHAR(255);
ALTER TABLE ai_settings ADD COLUMN model    VARCHAR(128);
ALTER TABLE ai_settings ADD COLUMN base_url VARCHAR(512);

UPDATE ai_settings
SET provider = CASE WHEN anthropic_api_key IS NOT NULL THEN 'ANTHROPIC' END,
    api_key  = anthropic_api_key,
    model    = anthropic_model;

ALTER TABLE ai_settings DROP COLUMN anthropic_api_key;
ALTER TABLE ai_settings DROP COLUMN anthropic_model;
