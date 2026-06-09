package com.gabrielaraujo.thothai.media

/** Abstração de armazenamento de objetos, desacoplando o serviço do cliente MinIO concreto. */
internal interface ObjectStorage {
    fun store(
        objectKey: String,
        data: ByteArray,
        contentType: String,
    )

    fun delete(objectKey: String)
}
