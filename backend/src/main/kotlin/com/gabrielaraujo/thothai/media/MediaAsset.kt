package com.gabrielaraujo.thothai.media

import com.gabrielaraujo.thothai.shared.AbstractTenantEntity
import jakarta.persistence.CollectionTable
import jakarta.persistence.Column
import jakarta.persistence.ElementCollection
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.Table
import org.hibernate.annotations.BatchSize

/**
 * Mídia incorporada persistida no MinIO (RF03 / RNF01). A imagem em si fica no storage; aqui
 * guardamos os metadados (descrição/alt para acessibilidade, dimensões) e a URL pública.
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
    /** Texto alternativo (acessibilidade) editável no painel. */
    @Column(name = "alt_text", length = 255)
    var altText: String? = null,
    @Column(name = "description", length = 500)
    var description: String? = null,
    /** Dimensões em pixels, extraídas no upload (nulas para formatos não decodificáveis). */
    @Column(name = "width")
    var width: Int? = null,
    @Column(name = "height")
    var height: Int? = null,
    /**
     * Tags livres para filtro na galeria. EAGER porque os DTOs são montados fora da transação
     * (open-in-view desligado); o BatchSize carrega as coleções em lote, evitando N+1.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "media_tags", joinColumns = [JoinColumn(name = "media_id")])
    @Column(name = "tag", nullable = false, length = 64)
    @BatchSize(size = 64)
    var tags: MutableSet<String> = mutableSetOf(),
) : AbstractTenantEntity()
