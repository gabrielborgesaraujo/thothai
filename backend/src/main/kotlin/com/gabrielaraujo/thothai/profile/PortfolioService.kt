package com.gabrielaraujo.thothai.profile

import com.gabrielaraujo.thothai.shared.ResourceNotFoundException
import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/** CRUD das entradas de portfólio (RF08), com ocultação seletiva. Filtra por tenant (RNF03). */
@Service
@Transactional
internal class PortfolioService(
    private val entries: PortfolioEntryRepository,
) {
    @Transactional(readOnly = true)
    fun list(): List<PortfolioEntry> = entries.findAllByTenantIdOrderByCategoryAscDisplayOrderAsc(TenantContext.currentTenant())

    @Transactional(readOnly = true)
    fun listVisible(): List<PortfolioEntry> =
        entries.findAllByTenantIdAndVisibleIsTrueOrderByCategoryAscDisplayOrderAsc(TenantContext.currentTenant())

    @Transactional(readOnly = true)
    fun get(id: UUID): PortfolioEntry =
        entries.findByTenantIdAndId(TenantContext.currentTenant(), id)
            ?: throw ResourceNotFoundException("Entrada de portfólio não encontrada")

    fun create(request: PortfolioEntryRequest): PortfolioEntry =
        entries.save(
            PortfolioEntry(
                category = request.category,
                title = request.title,
                organization = request.organization,
                description = request.description,
                startDate = request.startDate,
                endDate = request.endDate,
                visible = request.visible,
                displayOrder = request.displayOrder,
            ),
        )

    fun update(
        id: UUID,
        request: PortfolioEntryRequest,
    ): PortfolioEntry {
        val entry = get(id)
        entry.category = request.category
        entry.title = request.title
        entry.organization = request.organization
        entry.description = request.description
        entry.startDate = request.startDate
        entry.endDate = request.endDate
        entry.visible = request.visible
        entry.displayOrder = request.displayOrder
        return entry
    }

    fun delete(id: UUID) {
        entries.delete(get(id))
    }
}
