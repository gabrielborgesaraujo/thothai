package com.gabrielaraujo.thothai.content

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.time.Instant
import java.util.UUID

/**
 * Repositório de postagens. Todas as consultas filtram por `tenantId` (RNF03 — isolamento de tenant),
 * mesmo no MVP single-publisher, para evitar refatoração na transição multi-tenant.
 * Exceção: [findDueForPublication], um job de sistema que opera linha a linha em todos os tenants.
 */
internal interface PostRepository : JpaRepository<Post, UUID> {
    fun findByTenantIdAndId(
        tenantId: String,
        id: UUID,
    ): Post?

    /** Listagem do admin com filtros opcionais; `q` chega minúsculo ('' desativa a busca). */
    @Query(
        """
        SELECT p FROM Post p
        WHERE p.tenantId = :tenantId
          AND (:status IS NULL OR p.status = :status)
          AND (:type IS NULL OR p.type = :type)
          AND (:q = '' OR LOWER(p.title) LIKE CONCAT('%', :q, '%') OR LOWER(p.summary) LIKE CONCAT('%', :q, '%'))
        ORDER BY p.createdAt DESC
        """,
    )
    fun search(
        tenantId: String,
        status: PostStatus?,
        type: PostType?,
        q: String,
        pageable: Pageable,
    ): Page<Post>

    /** Listagem pública com busca e filtro por tag ('' desativa cada filtro). */
    @Query(
        """
        SELECT p FROM Post p
        WHERE p.tenantId = :tenantId AND p.status = :status
          AND (:q = '' OR LOWER(p.title) LIKE CONCAT('%', :q, '%') OR LOWER(p.summary) LIKE CONCAT('%', :q, '%'))
          AND (:tag = '' OR :tag MEMBER OF p.tags)
        ORDER BY p.publishedAt DESC
        """,
    )
    fun searchPublished(
        tenantId: String,
        status: PostStatus,
        q: String,
        tag: String,
        pageable: Pageable,
    ): Page<Post>

    /** Tags distintas dos posts no status dado (alimenta os chips de filtro do portal). */
    @Query(
        """
        SELECT DISTINCT t FROM Post p JOIN p.tags t
        WHERE p.tenantId = :tenantId AND p.status = :status
        ORDER BY t
        """,
    )
    fun findDistinctTags(
        tenantId: String,
        status: PostStatus,
    ): List<String>

    /** Posts agendados cujo horário venceu — consumido pelo job de publicação (todos os tenants). */
    @Query("SELECT p FROM Post p WHERE p.status = :status AND p.scheduledAt <= :now")
    fun findDueForPublication(
        status: PostStatus,
        now: Instant,
    ): List<Post>

    fun findByTenantIdAndStatusAndSlug(
        tenantId: String,
        status: PostStatus,
        slug: String,
    ): Post?

    fun findByTenantIdAndStatusOrderByPublishedAtDesc(
        tenantId: String,
        status: PostStatus,
        pageable: Pageable,
    ): Page<Post>

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
