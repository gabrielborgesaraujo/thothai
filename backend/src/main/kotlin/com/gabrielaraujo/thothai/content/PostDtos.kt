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
    val summary: String?,
    val bannerUrl: String?,
    val tags: List<String>,
    val publishedAt: Instant?,
    val scheduledAt: Instant?,
)

/** Contadores para o dashboard do admin. */
data class PostStatsResponse(
    val draft: Long,
    val scheduled: Long,
    val published: Long,
    val total: Long,
)

/** Postagem publicada para leitura pública (RF06). */
data class PublicPostResponse(
    val title: String,
    val slug: String,
    val type: PostType,
    val summary: String?,
    val body: String,
    val bannerUrl: String?,
    val tags: List<String>,
    val publishedAt: Instant?,
)

internal fun Post.toResponse() =
    PostResponse(
        id = requireNotNull(id),
        title = title,
        slug = slug,
        type = type,
        status = status,
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
        summary = summary,
        bannerUrl = bannerUrl,
        tags = tags.sorted(),
        publishedAt = publishedAt,
        scheduledAt = scheduledAt,
    )

internal fun Post.toPublic() =
    PublicPostResponse(
        title = title,
        slug = slug,
        type = type,
        summary = summary,
        body = body,
        bannerUrl = bannerUrl,
        tags = tags.sorted(),
        publishedAt = publishedAt,
    )
