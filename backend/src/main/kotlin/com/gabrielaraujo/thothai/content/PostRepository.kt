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

    /**
     * Listagem pública com filtro por tag e busca FULL-TEXT (título + resumo + corpo, via
     * `search_vector`/GIN), ranqueada por relevância quando há termo ('' desativa cada filtro).
     */
    @Query(
        nativeQuery = true,
        value = """
            SELECT p.* FROM posts p
            WHERE p.tenant_id = :tenantId AND p.status = 'PUBLISHED'
              AND (:tag = '' OR EXISTS (SELECT 1 FROM post_tags pt WHERE pt.post_id = p.id AND pt.tag = :tag))
              AND (:q = '' OR p.search_vector @@ plainto_tsquery('portuguese', :q))
            ORDER BY
              (CASE WHEN :q = '' THEN 0 ELSE ts_rank(p.search_vector, plainto_tsquery('portuguese', :q)) END) DESC,
              p.published_at DESC
        """,
        countQuery = """
            SELECT COUNT(*) FROM posts p
            WHERE p.tenant_id = :tenantId AND p.status = 'PUBLISHED'
              AND (:tag = '' OR EXISTS (SELECT 1 FROM post_tags pt WHERE pt.post_id = p.id AND pt.tag = :tag))
              AND (:q = '' OR p.search_vector @@ plainto_tsquery('portuguese', :q))
        """,
    )
    fun searchPublished(
        tenantId: String,
        q: String,
        tag: String,
        pageable: Pageable,
    ): Page<Post>

    /** Publicações que compartilham tags com o post de referência, mais afins primeiro. */
    @Query(
        """
        SELECT p FROM Post p JOIN p.tags t
        WHERE p.tenantId = :tenantId AND p.status = :status AND p.slug <> :slug AND t IN :tags
        GROUP BY p
        ORDER BY COUNT(t) DESC, MAX(p.publishedAt) DESC
        """,
    )
    fun findRelated(
        tenantId: String,
        status: PostStatus,
        slug: String,
        tags: Collection<String>,
        pageable: Pageable,
    ): List<Post>

    fun findFirstByTenantIdAndStatusAndPublishedAtLessThanOrderByPublishedAtDesc(
        tenantId: String,
        status: PostStatus,
        publishedAt: Instant,
    ): Post?

    fun findFirstByTenantIdAndStatusAndPublishedAtGreaterThanOrderByPublishedAtAsc(
        tenantId: String,
        status: PostStatus,
        publishedAt: Instant,
    ): Post?

    /** Postagens que referenciam a URL de mídia (banner ou corpo) — protege a exclusão na galeria. */
    @Query(
        """
        SELECT COUNT(p) FROM Post p
        WHERE p.tenantId = :tenantId AND (p.bannerUrl = :url OR p.body LIKE CONCAT('%', :url, '%'))
        """,
    )
    fun countMediaUsage(
        tenantId: String,
        url: String,
    ): Long

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

    /** Publicados de TODOS os tenants (feed/sitemap da plataforma — URLs montadas por handle). */
    fun findByStatusOrderByPublishedAtDesc(
        status: PostStatus,
        pageable: Pageable,
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
