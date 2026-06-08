package com.gabrielaraujo.thothai.content

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

/**
 * Repositório de postagens. Todas as consultas filtram por `tenantId` (RNF03 — isolamento de tenant),
 * mesmo no MVP single-publisher, para evitar refatoração na transição multi-tenant.
 */
internal interface PostRepository : JpaRepository<Post, UUID> {
    fun findByTenantIdAndId(
        tenantId: String,
        id: UUID,
    ): Post?

    fun findAllByTenantIdOrderByCreatedAtDesc(tenantId: String): List<Post>

    fun findByTenantIdAndStatusOrderByPublishedAtDesc(
        tenantId: String,
        status: PostStatus,
    ): List<Post>

    fun findByTenantIdAndStatusAndSlug(
        tenantId: String,
        status: PostStatus,
        slug: String,
    ): Post?

    fun existsByTenantIdAndSlug(
        tenantId: String,
        slug: String,
    ): Boolean
}
