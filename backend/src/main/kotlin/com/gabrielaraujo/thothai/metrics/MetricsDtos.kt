package com.gabrielaraujo.thothai.metrics

import jakarta.validation.constraints.Size
import java.time.LocalDate

/** Beacon enviado pelo portal público ('view' a cada navegação; 'read' ao concluir a leitura). */
data class ViewRequest(
    @field:Size(max = 200)
    val path: String?,
    @field:Size(max = 16)
    val metric: String? = null,
    @field:Size(max = 1024)
    val referrer: String? = null,
)

data class DailyViewsPoint(
    val date: LocalDate,
    val views: Long,
)

data class TopPostViews(
    val slug: String,
    val views: Long,
    val reads: Long,
)

data class ReferrerViews(
    val host: String,
    val views: Long,
)

/** Resumo de acessos/leituras para o dashboard do admin. */
data class MetricsSummaryResponse(
    val totalViews: Long,
    val viewsLast7Days: Long,
    val viewsLast30Days: Long,
    val readsLast30Days: Long,
    val daily: List<DailyViewsPoint>,
    val topPosts: List<TopPostViews>,
    val topReferrers: List<ReferrerViews>,
)
