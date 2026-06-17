package com.gabrielaraujo.thothai.assistant

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

/** Acesso aos embeddings de publicações. Visível apenas dentro do módulo `assistant`. */
internal interface PostEmbeddingRepository : JpaRepository<PostEmbedding, UUID> {
    fun findByTenantId(tenantId: String): List<PostEmbedding>

    fun findByTenantIdAndPostId(
        tenantId: String,
        postId: UUID,
    ): PostEmbedding?

    fun countByTenantId(tenantId: String): Long

    fun deleteByPostId(postId: UUID)
}
