package com.gabrielaraujo.thothai.media

/** Abstração de armazenamento de objetos, desacoplando o serviço do cliente MinIO concreto. */
internal interface ObjectStorage {
    fun store(
        objectKey: String,
        data: ByteArray,
        contentType: String,
    )

    /** Baixa os bytes de um objeto (usado pela edição de imagem no servidor). */
    fun fetch(objectKey: String): ByteArray

    fun delete(objectKey: String)
}
