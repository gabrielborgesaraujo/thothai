package com.gabrielaraujo.thothai.media

import java.time.Instant
import java.util.UUID

/** Resposta do upload (RF03): a [url] pública é injetada no Markdown do corpo da postagem. */
data class MediaResponse(
    val url: String,
    val originalFilename: String?,
    val contentType: String,
    val sizeBytes: Long,
)

/** Item da listagem de mídias para a gestão no painel. */
data class MediaSummaryResponse(
    val id: UUID,
    val url: String,
    val originalFilename: String?,
    val contentType: String,
    val sizeBytes: Long,
    val createdAt: Instant?,
)

internal fun MediaAsset.toResponse() =
    MediaResponse(
        url = publicUrl,
        originalFilename = originalFilename,
        contentType = contentType,
        sizeBytes = sizeBytes,
    )

internal fun MediaAsset.toSummary() =
    MediaSummaryResponse(
        id = requireNotNull(id),
        url = publicUrl,
        originalFilename = originalFilename,
        contentType = contentType,
        sizeBytes = sizeBytes,
        createdAt = createdAt,
    )
