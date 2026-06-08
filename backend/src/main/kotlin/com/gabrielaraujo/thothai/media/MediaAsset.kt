package com.gabrielaraujo.thothai.media

import com.gabrielaraujo.thothai.shared.AbstractTenantEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table

/**
 * Mídia incorporada persistida no MinIO (RF03 / RNF01). A imagem em si fica no storage; aqui
 * guardamos apenas os metadados e a URL pública.
 */
@Entity
@Table(name = "media_assets")
class MediaAsset(
    @Column(name = "object_key", nullable = false)
    var objectKey: String,
    @Column(name = "public_url", nullable = false)
    var publicUrl: String,
    @Column(name = "content_type", nullable = false)
    var contentType: String,
    @Column(name = "size_bytes", nullable = false)
    var sizeBytes: Long,
    @Column(name = "original_filename")
    var originalFilename: String?,
) : AbstractTenantEntity()
