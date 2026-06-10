package com.gabrielaraujo.thothai.media

import jakarta.validation.constraints.Size
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
    val altText: String?,
    val description: String?,
    val width: Int?,
    val height: Int?,
    val tags: List<String>,
    val createdAt: Instant?,
)

/** Atualização dos metadados editáveis de uma mídia. */
data class MediaUpdateRequest(
    @field:Size(max = 255)
    val altText: String?,
    @field:Size(max = 500)
    val description: String?,
    @field:Size(max = 10)
    val tags: List<
        @Size(max = 64)
        String,
    > = emptyList(),
)

/** Região de corte em pixels, no espaço da imagem já rotacionada. */
data class CropRect(
    val x: Int,
    val y: Int,
    val width: Int,
    val height: Int,
)

/**
 * Edição de imagem aplicada no servidor, na ordem: rotação → corte → redimensionamento.
 * Gera uma NOVA mídia (o original permanece intacto).
 */
data class MediaEditRequest(
    /** 0, 90, 180 ou 270 graus (sentido horário). */
    val rotate: Int = 0,
    val crop: CropRect? = null,
    /** Largura final em px (altura proporcional); nula mantém. */
    val targetWidth: Int? = null,
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
        altText = altText,
        description = description,
        width = width,
        height = height,
        tags = tags.sorted(),
        createdAt = createdAt,
    )
