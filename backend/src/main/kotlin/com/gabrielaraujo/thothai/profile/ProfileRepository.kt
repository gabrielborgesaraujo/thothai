package com.gabrielaraujo.thothai.profile

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

internal interface ProfileRepository : JpaRepository<Profile, UUID> {
    fun findByTenantId(tenantId: String): Profile?
}
