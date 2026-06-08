-- Registro de publicação de eventos do Spring Modulith (starter-jpa), que suporta a entrega
-- transacional/assíncrona de eventos entre módulos. Tabela de infraestrutura do framework;
-- colunas espelham a entidade JpaEventPublication (Spring Modulith 2.0.x).
CREATE TABLE IF NOT EXISTS event_publication (
    id                     UUID NOT NULL,
    listener_id            TEXT NOT NULL,
    event_type             TEXT NOT NULL,
    serialized_event       TEXT NOT NULL,
    publication_date       TIMESTAMP WITH TIME ZONE NOT NULL,
    completion_date        TIMESTAMP WITH TIME ZONE,
    last_resubmission_date TIMESTAMP WITH TIME ZONE,
    completion_attempts    INTEGER NOT NULL DEFAULT 0,
    status                 TEXT,
    PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_event_publication_completion_date
    ON event_publication (completion_date);

CREATE INDEX IF NOT EXISTS idx_event_publication_listener_serialized
    ON event_publication (listener_id, serialized_event);
