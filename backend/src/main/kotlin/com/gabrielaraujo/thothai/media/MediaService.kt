package com.gabrielaraujo.thothai.media

import com.gabrielaraujo.thothai.shared.InvalidRequestException
import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

/**
 * Regras de upload de mídias (RF03): valida o tipo, persiste no storage e registra os metadados.
 * Filtra por tenant corrente ([TenantContext]) — RNF03.
 */
@Service
@Transactional
internal class MediaService(
    private val storage: ObjectStorage,
    private val mediaAssets: MediaAssetRepository,
    private val properties: StorageProperties,
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

        val tenant = TenantContext.currentTenant()
        val objectKey = "images/$tenant/${UUID.randomUUID()}.$extension"
        val publicUrl = "${properties.publicUrl.trimEnd('/')}/${properties.bucket}/$objectKey"

        storage.store(objectKey, file.bytes, contentType)

        return mediaAssets.save(
            MediaAsset(
                objectKey = objectKey,
                publicUrl = publicUrl,
                contentType = contentType,
                sizeBytes = file.size,
                originalFilename = file.originalFilename,
            ),
        )
    }

    private companion object {
        val ALLOWED_IMAGE_TYPES =
            mapOf(
                "image/png" to "png",
                "image/jpeg" to "jpg",
                "image/gif" to "gif",
                "image/webp" to "webp",
            )
    }
}
