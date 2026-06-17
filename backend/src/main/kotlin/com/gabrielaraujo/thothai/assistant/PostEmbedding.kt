package com.gabrielaraujo.thothai.assistant

import com.gabrielaraujo.thothai.shared.AbstractTenantEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.util.UUID

/**
 * Embedding de uma publicação (memória do autor / RAG). O vetor é guardado como JSON de floats
 * (`embedding`); a similaridade é calculada na aplicação. `sourceHash` detecta mudança de texto.
 */
@Entity
@Table(name = "post_embeddings")
class PostEmbedding(
    @Column(name = "post_id", nullable = false)
    var postId: UUID,
    @Column(name = "source_hash", nullable = false, length = 64)
    var sourceHash: String,
    @Column(name = "model", nullable = false, length = 128)
    var model: String,
    @Column(name = "embedding", nullable = false)
    var embedding: String,
) : AbstractTenantEntity()
