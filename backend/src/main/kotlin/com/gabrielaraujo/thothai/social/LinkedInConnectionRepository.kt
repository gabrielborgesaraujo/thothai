package com.gabrielaraujo.thothai.social

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

internal interface LinkedInConnectionRepository : JpaRepository<LinkedInConnection, UUID> {
    fun findByTenantId(tenantId: String): LinkedInConnection?
}
