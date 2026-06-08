package com.gabrielaraujo.thothai.content

import com.gabrielaraujo.thothai.shared.ResourceNotFoundException
import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/**
 * Regras de negócio do gerenciador de postagens (RF02) e da leitura pública (RF06).
 * Todas as operações filtram pelo tenant corrente ([TenantContext]) — RNF03.
 */
@Service
@Transactional
internal class PostService(
    private val posts: PostRepository,
) {
    @Transactional(readOnly = true)
    fun list(): List<Post> = posts.findAllByTenantIdOrderByCreatedAtDesc(TenantContext.currentTenant())

    @Transactional(readOnly = true)
    fun get(id: UUID): Post =
        posts.findByTenantIdAndId(TenantContext.currentTenant(), id)
            ?: throw ResourceNotFoundException("Postagem não encontrada")

    fun create(request: PostRequest): Post {
        val tenant = TenantContext.currentTenant()
        val source = request.slug?.takeIf { it.isNotBlank() } ?: request.title
        val post =
            Post(
                title = request.title,
                slug = uniqueSlug(tenant, source),
                type = request.type,
                status = request.status,
                summary = request.summary,
                body = request.body,
                publishedAt = if (request.status == PostStatus.PUBLISHED) Instant.now() else null,
            )
        return posts.save(post)
    }

    fun update(
        id: UUID,
        request: PostRequest,
    ): Post {
        val post = get(id)
        post.title = request.title
        post.type = request.type
        post.summary = request.summary
        post.body = request.body
        // O slug permanece estável (não quebra URLs publicadas) salvo se um novo for informado.
        request.slug
            ?.takeIf { it.isNotBlank() && it != post.slug }
            ?.let { post.slug = uniqueSlug(post.tenantId, it) }
        // publishedAt é definido na primeira transição para PUBLISHED.
        if (request.status == PostStatus.PUBLISHED && post.publishedAt == null) {
            post.publishedAt = Instant.now()
        }
        post.status = request.status
        return post
    }

    fun delete(id: UUID) {
        posts.delete(get(id))
    }

    @Transactional(readOnly = true)
    fun listPublished(): List<Post> =
        posts.findByTenantIdAndStatusOrderByPublishedAtDesc(TenantContext.currentTenant(), PostStatus.PUBLISHED)

    @Transactional(readOnly = true)
    fun getPublishedBySlug(slug: String): Post =
        posts.findByTenantIdAndStatusAndSlug(TenantContext.currentTenant(), PostStatus.PUBLISHED, slug)
            ?: throw ResourceNotFoundException("Postagem não encontrada")

    /** Gera um slug único no tenant, sufixando `-2`, `-3`… em caso de colisão. */
    private fun uniqueSlug(
        tenant: String,
        source: String,
    ): String {
        val base = Slugs.slugify(source)
        if (!posts.existsByTenantIdAndSlug(tenant, base)) {
            return base
        }
        var suffix = 2
        while (posts.existsByTenantIdAndSlug(tenant, "$base-$suffix")) {
            suffix++
        }
        return "$base-$suffix"
    }
}
