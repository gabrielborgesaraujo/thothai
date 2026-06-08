package com.gabrielaraujo.thothai.media

/** Resposta do upload (RF03): a [url] pública é injetada no Markdown do corpo da postagem. */
data class MediaResponse(
    val url: String,
    val originalFilename: String?,
    val contentType: String,
    val sizeBytes: Long,
)

internal fun MediaAsset.toResponse() =
    MediaResponse(
        url = publicUrl,
        originalFilename = originalFilename,
        contentType = contentType,
        sizeBytes = sizeBytes,
    )
