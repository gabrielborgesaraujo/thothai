package com.gabrielaraujo.thothai.media

import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * API pública do módulo de mídia para persistir uma imagem **gerada por outro módulo** (ex.: a
 * geração por IA do assistant) como uma [MediaAsset] do tenant corrente — assim a imagem entra na
 * galeria, ganha URL pública (MinIO/RNF01) e pode ser reusada/excluída como qualquer outra mídia.
 */
@Service
@Transactional
class MediaImageStore internal constructor(
    private val storage: ObjectStorage,
    private val mediaAssets: MediaAssetRepository,
    private val properties: StorageProperties,
) {
    /** Resultado da gravação: a URL pública alcançável pelo navegador. */
    data class StoredImage(
        val url: String,
        val width: Int?,
        val height: Int?,
    )

    /** Salva os bytes no storage e registra a mídia; retorna a URL pública. */
    fun store(
        bytes: ByteArray,
        contentType: String,
        originalFilename: String?,
    ): StoredImage {
        val extension = EXTENSIONS[contentType] ?: "png"
        val objectKey = "images/${TenantContext.currentTenant()}/${UUID.randomUUID()}.$extension"
        storage.store(objectKey, bytes, contentType)
        val dimensions = ImageEditor.dimensionsOf(bytes)
        val url = "${properties.publicUrl.trimEnd('/')}/${properties.bucket}/$objectKey"
        mediaAssets.save(
            MediaAsset(
                objectKey = objectKey,
                publicUrl = url,
                contentType = contentType,
                sizeBytes = bytes.size.toLong(),
                originalFilename = originalFilename,
                width = dimensions?.first,
                height = dimensions?.second,
            ),
        )
        return StoredImage(url, dimensions?.first, dimensions?.second)
    }

    private companion object {
        val EXTENSIONS = mapOf("image/png" to "png", "image/jpeg" to "jpg", "image/webp" to "webp")
    }
}
