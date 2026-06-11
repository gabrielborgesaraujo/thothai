package com.gabrielaraujo.thothai.media

import com.gabrielaraujo.thothai.content.ContentQueries
import com.gabrielaraujo.thothai.shared.BusinessRuleException
import com.gabrielaraujo.thothai.shared.InvalidRequestException
import com.gabrielaraujo.thothai.shared.ResourceNotFoundException
import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

/**
 * Regras de upload e gestão de mídias (RF03): valida o tipo, persiste no storage e registra os
 * metadados (incluindo dimensões e tags). Filtra por tenant corrente ([TenantContext]) — RNF03.
 */
@Service
@Transactional
internal class MediaService(
    private val storage: ObjectStorage,
    private val mediaAssets: MediaAssetRepository,
    private val properties: StorageProperties,
    private val contentQueries: ContentQueries,
) {
    fun upload(file: MultipartFile): MediaAsset {
        if (file.isEmpty) {
            throw InvalidRequestException("Arquivo vazio")
        }
        val contentType =
            file.contentType ?: throw InvalidRequestException("Tipo de arquivo desconhecido")
        val extension =
            ALLOWED_IMAGE_TYPES[contentType]
                ?: throw InvalidRequestException("Tipo de imagem não suportado: $contentType")

        val bytes = file.bytes
        val dimensions = ImageEditor.dimensionsOf(bytes)
        val objectKey = newObjectKey(extension)

        storage.store(objectKey, bytes, contentType)

        return mediaAssets.save(
            MediaAsset(
                objectKey = objectKey,
                publicUrl = publicUrl(objectKey),
                contentType = contentType,
                sizeBytes = bytes.size.toLong(),
                originalFilename = file.originalFilename,
                width = dimensions?.first,
                height = dimensions?.second,
            ),
        )
    }

    @Transactional(readOnly = true)
    fun list(
        query: String? = null,
        tag: String? = null,
    ): List<MediaAsset> =
        mediaAssets.search(
            TenantContext.currentTenant(),
            query?.trim()?.lowercase().orEmpty(),
            tag?.trim()?.lowercase().orEmpty(),
        )

    @Transactional(readOnly = true)
    fun tags(): List<String> = mediaAssets.findDistinctTags(TenantContext.currentTenant())

    /** Atualiza os metadados editáveis (alt, descrição e tags). */
    fun update(
        id: UUID,
        request: MediaUpdateRequest,
    ): MediaAsset {
        val asset = find(id)
        asset.altText = request.altText?.trim()?.ifBlank { null }
        asset.description = request.description?.trim()?.ifBlank { null }
        asset.tags.clear()
        asset.tags.addAll(normalizeTags(request.tags))
        return asset
    }

    /**
     * Aplica rotação → corte → redimensionamento no servidor e salva como NOVA mídia,
     * preservando o original e copiando os metadados editáveis.
     */
    fun edit(
        id: UUID,
        request: MediaEditRequest,
    ): MediaAsset {
        if (request.rotate == 0 && request.crop == null && request.targetWidth == null) {
            throw InvalidRequestException("Nenhuma transformação informada")
        }
        val source = find(id)
        val result =
            try {
                ImageEditor.transform(
                    data = storage.fetch(source.objectKey),
                    contentType = source.contentType,
                    rotateDegrees = request.rotate,
                    crop = request.crop,
                    targetWidth = request.targetWidth,
                )
            } catch (ex: IllegalArgumentException) {
                throw InvalidRequestException(ex.message ?: "Transformação inválida")
            }

        val extension = ALLOWED_IMAGE_TYPES.getValue(result.contentType)
        val objectKey = newObjectKey(extension)
        storage.store(objectKey, result.bytes, result.contentType)

        return mediaAssets.save(
            MediaAsset(
                objectKey = objectKey,
                publicUrl = publicUrl(objectKey),
                contentType = result.contentType,
                sizeBytes = result.bytes.size.toLong(),
                originalFilename = editedFilename(source.originalFilename),
                altText = source.altText,
                description = source.description,
                width = result.width,
                height = result.height,
                tags = source.tags.toMutableSet(),
            ),
        )
    }

    fun delete(id: UUID) {
        val asset = find(id)
        // Protege conteúdo publicado: mídia referenciada por posts não pode ser excluída.
        val usage = contentQueries.mediaUsageCount(asset.publicUrl)
        if (usage > 0) {
            throw BusinessRuleException(
                "Mídia em uso em $usage postagem(ns) — remova-a dos conteúdos antes de excluir",
            )
        }
        storage.delete(asset.objectKey)
        mediaAssets.delete(asset)
    }

    private fun find(id: UUID): MediaAsset =
        mediaAssets.findByTenantIdAndId(TenantContext.currentTenant(), id)
            ?: throw ResourceNotFoundException("Mídia não encontrada")

    private fun newObjectKey(extension: String): String = "images/${TenantContext.currentTenant()}/${UUID.randomUUID()}.$extension"

    private fun publicUrl(objectKey: String): String = "${properties.publicUrl.trimEnd('/')}/${properties.bucket}/$objectKey"

    private fun editedFilename(original: String?): String? =
        original?.let {
            val dot = it.lastIndexOf('.')
            if (dot > 0) "${it.substring(0, dot)} (editada)${it.substring(dot)}" else "$it (editada)"
        }

    private fun normalizeTags(tags: List<String>): Set<String> =
        tags
            .asSequence()
            .map { it.trim().lowercase().replace(WHITESPACE, " ") }
            .filter { it.isNotEmpty() }
            .map { it.take(64) }
            .toSet()

    private companion object {
        val WHITESPACE = Regex("\\s+")
        val ALLOWED_IMAGE_TYPES =
            mapOf(
                "image/png" to "png",
                "image/jpeg" to "jpg",
                "image/gif" to "gif",
                "image/webp" to "webp",
            )
    }
}
