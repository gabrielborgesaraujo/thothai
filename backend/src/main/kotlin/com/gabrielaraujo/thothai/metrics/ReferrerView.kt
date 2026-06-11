package com.gabrielaraujo.thothai.metrics

import com.gabrielaraujo.thothai.shared.AbstractTenantEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.time.LocalDate

/** Origem do tráfego: contagem agregada por dia + host do referrer externo. */
@Entity
@Table(name = "referrer_views")
class ReferrerView(
    @Column(name = "view_date", nullable = false)
    var viewDate: LocalDate,
    @Column(name = "host", nullable = false, length = 160)
    var host: String,
    @Column(name = "views", nullable = false)
    var views: Long = 0,
) : AbstractTenantEntity()
