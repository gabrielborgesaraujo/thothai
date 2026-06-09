package com.gabrielaraujo.thothai.media

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

internal interface MediaAssetRepository : JpaRepository<MediaAsset, UUID> {
    fun findAllByTenantIdOrderByCreatedAtDesc(tenantId: String): List<MediaAsset>

    fun findByTenantIdAndId(
        tenantId: String,
        id: UUID,
    ): MediaAsset?
}
