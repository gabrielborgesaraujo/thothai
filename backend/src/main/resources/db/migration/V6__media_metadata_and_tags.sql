-- Metadados editáveis e dimensões das mídias (acessibilidade, organização e edição de imagem).
ALTER TABLE media_assets ADD COLUMN alt_text    VARCHAR(255);
ALTER TABLE media_assets ADD COLUMN description VARCHAR(500);
ALTER TABLE media_assets ADD COLUMN width       INTEGER;
ALTER TABLE media_assets ADD COLUMN height      INTEGER;

-- Tags livres por mídia, para filtro na galeria. Isolamento de tenant herdado via media_id.
CREATE TABLE media_tags (
    media_id UUID        NOT NULL REFERENCES media_assets (id) ON DELETE CASCADE,
    tag      VARCHAR(64) NOT NULL,
    PRIMARY KEY (media_id, tag)
);

CREATE INDEX idx_media_tags_tag ON media_tags (tag);
