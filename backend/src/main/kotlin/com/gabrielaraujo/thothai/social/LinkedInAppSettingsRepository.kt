package com.gabrielaraujo.thothai.social

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

internal interface LinkedInAppSettingsRepository : JpaRepository<LinkedInAppSettings, UUID> {
    fun findFirstByOrderByCreatedAtAsc(): LinkedInAppSettings?
}
