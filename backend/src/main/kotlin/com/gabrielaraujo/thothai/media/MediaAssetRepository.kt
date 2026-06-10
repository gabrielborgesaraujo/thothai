package com.gabrielaraujo.thothai.media

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.util.UUID

internal interface MediaAssetRepository : JpaRepository<MediaAsset, UUID> {
    /** Galeria com filtros opcionais; `q` chega minúsculo ('' desativa) e busca nome/alt/descrição. */
    @Query(
        """
        SELECT m FROM MediaAsset m
        WHERE m.tenantId = :tenantId
          AND (:q = '' OR LOWER(m.originalFilename) LIKE CONCAT('%', :q, '%')
               OR LOWER(m.altText) LIKE CONCAT('%', :q, '%')
               OR LOWER(m.description) LIKE CONCAT('%', :q, '%'))
          AND (:tag = '' OR :tag MEMBER OF m.tags)
        ORDER BY m.createdAt DESC
        """,
    )
    fun search(
        tenantId: String,
        q: String,
        tag: String,
    ): List<MediaAsset>

    /** Tags distintas em uso nas mídias do tenant (chips de filtro da galeria). */
    @Query(
        """
        SELECT DISTINCT t FROM MediaAsset m JOIN m.tags t
        WHERE m.tenantId = :tenantId
        ORDER BY t
        """,
    )
    fun findDistinctTags(tenantId: String): List<String>

    fun findByTenantIdAndId(
        tenantId: String,
        id: UUID,
    ): MediaAsset?
}
