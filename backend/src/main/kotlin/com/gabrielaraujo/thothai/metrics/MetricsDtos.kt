package com.gabrielaraujo.thothai.metrics

import jakarta.validation.constraints.Size
import java.time.LocalDate

/** Beacon de acesso enviado pelo portal público. */
data class ViewRequest(
    @field:Size(max = 200)
    val path: String?,
)

data class DailyViewsPoint(
    val date: LocalDate,
    val views: Long,
)

data class TopPostViews(
    val slug: String,
    val views: Long,
)

/** Resumo de acessos para o dashboard do admin. */
data class MetricsSummaryResponse(
    val totalViews: Long,
    val viewsLast7Days: Long,
    val viewsLast30Days: Long,
    val daily: List<DailyViewsPoint>,
    val topPosts: List<TopPostViews>,
)
