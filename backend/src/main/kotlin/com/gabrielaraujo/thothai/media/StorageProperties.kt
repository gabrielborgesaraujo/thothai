package com.gabrielaraujo.thothai.media

import org.springframework.boot.context.properties.ConfigurationProperties

/**
 * Configuração do storage de objetos MinIO/S3 (RNF01), prefixo `thothai.storage`.
 *
 * - [endpoint]: URL interna usada pelo backend para falar com o MinIO.
 * - [publicUrl]: URL alcançável pelo navegador, usada para montar a URL pública das mídias.
 */
@ConfigurationProperties(prefix = "thothai.storage")
data class StorageProperties(
    val endpoint: String,
    val publicUrl: String,
    val accessKey: String,
    val secretKey: String,
    val bucket: String,
)
