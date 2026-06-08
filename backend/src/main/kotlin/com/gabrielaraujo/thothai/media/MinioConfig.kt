package com.gabrielaraujo.thothai.media

import io.minio.MinioClient
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/** Provê o cliente MinIO a partir da [StorageProperties]. A construção não abre conexão. */
@Configuration
@EnableConfigurationProperties(StorageProperties::class)
internal class MinioConfig {
    @Bean
    fun minioClient(properties: StorageProperties): MinioClient =
        MinioClient
            .builder()
            .endpoint(properties.endpoint)
            .credentials(properties.accessKey, properties.secretKey)
            .build()
}
