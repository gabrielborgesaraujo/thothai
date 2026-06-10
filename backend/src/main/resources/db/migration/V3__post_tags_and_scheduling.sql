-- Tags livres por postagem, para filtro e descoberta no portal público e no admin.
-- O isolamento de tenant (RNF03) é herdado via post_id -> posts.tenant_id.
CREATE TABLE post_tags (
    post_id UUID        NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    tag     VARCHAR(64) NOT NULL,
    PRIMARY KEY (post_id, tag)
);

CREATE INDEX idx_post_tags_tag ON post_tags (tag);

-- Publicação agendada: posts com status SCHEDULED carregam o horário-alvo em scheduled_at;
-- um job periódico promove a PUBLISHED os que venceram.
ALTER TABLE posts ADD COLUMN scheduled_at TIMESTAMPTZ;

CREATE INDEX idx_posts_status_scheduled ON posts (status, scheduled_at);
