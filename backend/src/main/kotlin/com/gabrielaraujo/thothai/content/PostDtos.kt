package com.gabrielaraujo.thothai.content

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.Instant
import java.util.UUID

/** Payload de criação/atualização de postagem (RF02). O `slug` é opcional (derivado do título). */
data class PostRequest(
    @field:NotBlank
    @field:Size(max = 255)
    val title: String,
    val type: PostType,
    val status: PostStatus,
    /** Modelo de publicação; ausente assume o clássico [PostMode.PLATFORM]. */
    val mode: PostMode = PostMode.PLATFORM,
    @field:Size(max = 500)
    val summary: String?,
    @field:NotBlank
    val body: String,
    @field:Size(max = 255)
    val slug: String? = null,
    /** Imagem de capa (URL pública da mídia). */
    @field:Size(max = 1024)
    val bannerUrl: String? = null,
    /** Tags livres (normalizadas para minúsculas no serviço). */
    @field:Size(max = 10)
    val tags: List<
        @Size(max = 64)
        String,
    > = emptyList(),
    /** Obrigatório quando `status` é SCHEDULED; ignorado nos demais. */
    val scheduledAt: Instant? = null,
)

/** Representação completa de uma postagem para o painel admin. */
data class PostResponse(
    val id: UUID,
    val title: String,
    val slug: String,
    val type: PostType,
    val status: PostStatus,
    val mode: PostMode,
    val summary: String?,
    val body: String,
    val bannerUrl: String?,
    val tags: List<String>,
    val publishedAt: Instant?,
    val scheduledAt: Instant?,
    val createdAt: Instant?,
    val updatedAt: Instant?,
)

/** Item de listagem (sem corpo) — usado no admin e na listagem pública (RF06). */
data class PostSummaryResponse(
    val id: UUID,
    val title: String,
    val slug: String,
    val type: PostType,
    val status: PostStatus,
    val mode: PostMode,
    val summary: String?,
    val bannerUrl: String?,
    val tags: List<String>,
    val publishedAt: Instant?,
    val scheduledAt: Instant?,
    val linkedinSharedAt: Instant?,
)

/** Contadores para o dashboard do admin. */
data class PostStatsResponse(
    val draft: Long,
    val scheduled: Long,
    val published: Long,
    val total: Long,
)

/** Autor da publicação (link para o perfil no portal). */
data class PostAuthorResponse(
    val handle: String,
    val displayName: String,
)

/** Link de navegação entre publicações (anterior/próxima). */
data class PostLinkResponse(
    val slug: String,
    val title: String,
)

/** Publicação relacionada (tags em comum) exibida no fim da leitura. */
data class RelatedPostResponse(
    val slug: String,
    val title: String,
    val type: PostType,
    val bannerUrl: String?,
)

/** Versão do histórico (item da listagem). */
data class PostRevisionSummaryResponse(
    val id: UUID,
    val title: String,
    val createdAt: Instant?,
)

/** Versão completa para restauração no editor. */
data class PostRevisionResponse(
    val id: UUID,
    val title: String,
    val summary: String?,
    val body: String,
    val bannerUrl: String?,
    val createdAt: Instant?,
)

/** Postagem publicada para leitura pública (RF06), com navegação e relacionadas. */
data class PublicPostResponse(
    val title: String,
    val slug: String,
    val type: PostType,
    val summary: String?,
    val body: String,
    val bannerUrl: String?,
    val tags: List<String>,
    val publishedAt: Instant?,
    val author: PostAuthorResponse,
    val previous: PostLinkResponse?,
    val next: PostLinkResponse?,
    val related: List<RelatedPostResponse>,
)

internal fun Post.toResponse() =
    PostResponse(
        id = requireNotNull(id),
        title = title,
        slug = slug,
        type = type,
        status = status,
        mode = mode,
        summary = summary,
        body = body,
        bannerUrl = bannerUrl,
        tags = tags.sorted(),
        publishedAt = publishedAt,
        scheduledAt = scheduledAt,
        createdAt = createdAt,
        updatedAt = updatedAt,
    )

internal fun Post.toSummary() =
    PostSummaryResponse(
        id = requireNotNull(id),
        title = title,
        slug = slug,
        type = type,
        status = status,
        mode = mode,
        summary = summary,
        bannerUrl = bannerUrl,
        tags = tags.sorted(),
        publishedAt = publishedAt,
        scheduledAt = scheduledAt,
        linkedinSharedAt = linkedinSharedAt,
    )

internal fun Post.toLink() = PostLinkResponse(slug = slug, title = title)

internal fun Post.toRelated() = RelatedPostResponse(slug = slug, title = title, type = type, bannerUrl = bannerUrl)

internal fun PostRevision.toSummary() = PostRevisionSummaryResponse(id = requireNotNull(id), title = title, createdAt = createdAt)

internal fun PostRevision.toResponse() =
    PostRevisionResponse(
        id = requireNotNull(id),
        title = title,
        summary = summary,
        body = body,
        bannerUrl = bannerUrl,
        createdAt = createdAt,
    )

internal fun PostService.PublishedDetail.toPublic(author: PostAuthorResponse) =
    PublicPostResponse(
        title = post.title,
        slug = post.slug,
        type = post.type,
        summary = post.summary,
        body = post.body,
        bannerUrl = post.bannerUrl,
        tags = post.tags.sorted(),
        publishedAt = post.publishedAt,
        author = author,
        previous = previous?.toLink(),
        next = next?.toLink(),
        related = related.map { it.toRelated() },
    )
