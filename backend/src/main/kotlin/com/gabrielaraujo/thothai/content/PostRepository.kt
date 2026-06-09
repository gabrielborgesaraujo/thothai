package com.gabrielaraujo.thothai.content

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
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

    fun findByTenantIdOrderByCreatedAtDesc(
        tenantId: String,
        pageable: Pageable,
    ): Page<Post>

    fun findByTenantIdAndStatusOrderByPublishedAtDesc(
        tenantId: String,
        status: PostStatus,
        pageable: Pageable,
    ): Page<Post>

    fun findByTenantIdAndStatusAndSlug(
        tenantId: String,
        status: PostStatus,
        slug: String,
    ): Post?

    fun existsByTenantIdAndSlug(
        tenantId: String,
        slug: String,
    ): Boolean

    fun countByTenantId(tenantId: String): Long

    fun countByTenantIdAndStatus(
        tenantId: String,
        status: PostStatus,
    ): Long
}
