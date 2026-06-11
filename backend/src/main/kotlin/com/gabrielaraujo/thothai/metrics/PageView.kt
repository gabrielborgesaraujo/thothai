package com.gabrielaraujo.thothai.metrics

import com.gabrielaraujo.thothai.shared.AbstractTenantEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.time.LocalDate

/**
 * Contagem agregada de acessos: uma linha por dia + caminho do portal. O incremento é feito por
 * upsert atômico no repositório (não por load-modify-save), então a entidade é essencialmente
 * de leitura para o dashboard.
 */
@Entity
@Table(name = "page_views")
class PageView(
    @Column(name = "view_date", nullable = false)
    var viewDate: LocalDate,
    @Column(name = "path", nullable = false, length = 160)
    var path: String,
    @Column(name = "views", nullable = false)
    var views: Long = 0,
) : AbstractTenantEntity()
