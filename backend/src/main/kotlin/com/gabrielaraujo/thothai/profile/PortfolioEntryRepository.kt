package com.gabrielaraujo.thothai.profile

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

/** Acesso às entradas de portfólio. Todas as consultas filtram por `tenantId` (RNF03). */
internal interface PortfolioEntryRepository : JpaRepository<PortfolioEntry, UUID> {
    fun findAllByTenantIdOrderByCategoryAscDisplayOrderAsc(tenantId: String): List<PortfolioEntry>

    fun findAllByTenantIdAndVisibleIsTrueOrderByCategoryAscDisplayOrderAsc(tenantId: String): List<PortfolioEntry>

    fun findByTenantIdAndId(
        tenantId: String,
        id: UUID,
    ): PortfolioEntry?
}
