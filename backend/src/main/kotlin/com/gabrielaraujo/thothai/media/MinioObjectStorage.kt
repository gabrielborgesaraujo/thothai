package com.gabrielaraujo.thothai.media

import com.gabrielaraujo.thothai.shared.ExternalServiceException
import io.minio.MinioClient
import io.minio.PutObjectArgs
import org.springframework.stereotype.Component
import java.io.ByteArrayInputStream

/**
 * Implementação de [ObjectStorage] sobre o MinIO. Falhas de comunicação são traduzidas em
 * [ExternalServiceException] para não derrubar o painel em caso de indisponibilidade (RNF02).
 */
@Component
internal class MinioObjectStorage(
    private val minioClient: MinioClient,
    private val properties: StorageProperties,
) : ObjectStorage {
    override fun store(
        objectKey: String,
        data: ByteArray,
        contentType: String,
    ) {
        try {
            ByteArrayInputStream(data).use { stream ->
                minioClient.putObject(
                    PutObjectArgs
                        .builder()
                        .bucket(properties.bucket)
                        .`object`(objectKey)
                        .stream(stream, data.size.toLong(), -1)
                        .contentType(contentType)
                        .build(),
                )
            }
        } catch (ex: Exception) {
            throw ExternalServiceException("Falha ao enviar a mídia para o storage", ex)
        }
    }
}
