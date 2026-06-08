package com.gabrielaraujo.thothai.identity

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

/** Acesso a [AdminUser]. Visível apenas dentro do módulo `identity`. */
internal interface AdminUserRepository : JpaRepository<AdminUser, UUID> {
    fun findByTenantIdAndUsername(
        tenantId: String,
        username: String,
    ): AdminUser?

    fun existsByTenantId(tenantId: String): Boolean
}
