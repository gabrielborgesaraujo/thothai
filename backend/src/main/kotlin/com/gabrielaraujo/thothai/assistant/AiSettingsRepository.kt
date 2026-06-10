package com.gabrielaraujo.thothai.assistant

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

/** Repositório das chaves de IA por tenant (RNF03). */
internal interface AiSettingsRepository : JpaRepository<AiSettings, UUID> {
    fun findByTenantId(tenantId: String): AiSettings?
}
