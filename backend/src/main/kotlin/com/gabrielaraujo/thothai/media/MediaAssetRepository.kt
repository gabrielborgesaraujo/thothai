package com.gabrielaraujo.thothai.media

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

internal interface MediaAssetRepository : JpaRepository<MediaAsset, UUID>
