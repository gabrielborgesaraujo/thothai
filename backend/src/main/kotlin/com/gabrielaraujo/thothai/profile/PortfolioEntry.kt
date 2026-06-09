package com.gabrielaraujo.thothai.profile

import com.gabrielaraujo.thothai.shared.AbstractTenantEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import java.time.LocalDate

/**
 * Entrada do portfólio curricular (RF08): experiência, formação ou skill. A [visible] permite a
 * ocultação seletiva; a [displayOrder] define a ordem de exibição dentro da categoria.
 */
@Entity
@Table(name = "portfolio_entries")
class PortfolioEntry(
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 32)
    var category: PortfolioCategory,
    @Column(name = "title", nullable = false)
    var title: String,
    @Column(name = "organization")
    var organization: String?,
    @Column(name = "description")
    var description: String?,
    @Column(name = "start_date")
    var startDate: LocalDate?,
    @Column(name = "end_date")
    var endDate: LocalDate?,
    @Column(name = "visible", nullable = false)
    var visible: Boolean = true,
    @Column(name = "display_order", nullable = false)
    var displayOrder: Int = 0,
) : AbstractTenantEntity()
