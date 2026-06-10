package com.gabrielaraujo.thothai.content

import com.gabrielaraujo.thothai.shared.InvalidRequestException
import com.gabrielaraujo.thothai.shared.ResourceNotFoundException
import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
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
    fun list(
        pageable: Pageable,
        status: PostStatus? = null,
        type: PostType? = null,
        query: String? = null,
    ): Page<Post> = posts.search(TenantContext.currentTenant(), status, type, normalizeQuery(query), pageable)

    @Transactional(readOnly = true)
    fun stats(): PostStatsResponse {
        val tenant = TenantContext.currentTenant()
        val draft = posts.countByTenantIdAndStatus(tenant, PostStatus.DRAFT)
        val scheduled = posts.countByTenantIdAndStatus(tenant, PostStatus.SCHEDULED)
        val published = posts.countByTenantIdAndStatus(tenant, PostStatus.PUBLISHED)
        return PostStatsResponse(
            draft = draft,
            scheduled = scheduled,
            published = published,
            total = draft + scheduled + published,
        )
    }

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
                tags = normalizeTags(request.tags),
            )
        applyPublicationState(post, request)
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
        // Substituição em vez de nova coleção: preserva a coleção gerenciada pelo Hibernate.
        post.tags.clear()
        post.tags.addAll(normalizeTags(request.tags))
        // O slug permanece estável (não quebra URLs publicadas) salvo se um novo for informado.
        request.slug
            ?.takeIf { it.isNotBlank() && it != post.slug }
            ?.let { post.slug = uniqueSlug(post.tenantId, it) }
        applyPublicationState(post, request)
        return post
    }

    fun delete(id: UUID) {
        posts.delete(get(id))
    }

    @Transactional(readOnly = true)
    fun listPublished(
        pageable: Pageable,
        query: String? = null,
        tag: String? = null,
    ): Page<Post> =
        posts.searchPublished(
            TenantContext.currentTenant(),
            PostStatus.PUBLISHED,
            normalizeQuery(query),
            tag?.trim()?.lowercase().orEmpty(),
            pageable,
        )

    @Transactional(readOnly = true)
    fun publishedTags(): List<String> = posts.findDistinctTags(TenantContext.currentTenant(), PostStatus.PUBLISHED)

    @Transactional(readOnly = true)
    fun getPublishedBySlug(slug: String): Post =
        posts.findByTenantIdAndStatusAndSlug(TenantContext.currentTenant(), PostStatus.PUBLISHED, slug)
            ?: throw ResourceNotFoundException("Postagem não encontrada")

    /** Promove a PUBLISHED os posts agendados vencidos (todos os tenants); retorna quantos publicou. */
    fun publishDueScheduled(now: Instant = Instant.now()): Int {
        val due = posts.findDueForPublication(PostStatus.SCHEDULED, now)
        due.forEach { post ->
            post.status = PostStatus.PUBLISHED
            // O horário agendado vale como o horário oficial de publicação.
            post.publishedAt = post.scheduledAt
            post.scheduledAt = null
        }
        return due.size
    }

    /**
     * Aplica as regras de transição de estado de publicação:
     * - PUBLISHED: fixa `publishedAt` na primeira publicação e limpa o agendamento;
     * - SCHEDULED: exige `scheduledAt`;
     * - DRAFT: limpa o agendamento.
     */
    private fun applyPublicationState(
        post: Post,
        request: PostRequest,
    ) {
        when (request.status) {
            PostStatus.PUBLISHED -> {
                if (post.publishedAt == null) {
                    post.publishedAt = Instant.now()
                }
                post.scheduledAt = null
            }

            PostStatus.SCHEDULED -> {
                post.scheduledAt = request.scheduledAt
                    ?: throw InvalidRequestException("Informe o horário de publicação para agendar a postagem")
            }

            PostStatus.DRAFT -> {
                post.scheduledAt = null
            }
        }
        post.status = request.status
    }

    /** Normaliza o termo de busca para o repositório ('' desativa o filtro). */
    private fun normalizeQuery(query: String?): String = query?.trim()?.lowercase().orEmpty()

    /** Normaliza tags: minúsculas, espaços colapsados, vazias descartadas, deduplicadas. */
    private fun normalizeTags(tags: List<String>): MutableSet<String> =
        tags
            .asSequence()
            .map { it.trim().lowercase().replace(WHITESPACE, " ") }
            .filter { it.isNotEmpty() }
            .map { it.take(MAX_TAG_LENGTH) }
            .toMutableSet()

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

    private companion object {
        val WHITESPACE = Regex("\\s+")
        const val MAX_TAG_LENGTH = 64
    }
}
