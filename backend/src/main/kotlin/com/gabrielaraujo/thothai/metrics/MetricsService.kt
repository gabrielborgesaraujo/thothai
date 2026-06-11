package com.gabrielaraujo.thothai.metrics

import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

/**
 * Métricas de acesso do portal (dashboard do admin). O registro é best-effort e tolerante:
 * caminhos fora do formato esperado são simplesmente ignorados (beacon público — nunca propaga
 * erro para o leitor).
 */
@Service
@Transactional
internal class MetricsService(
    private val pageViews: PageViewRepository,
) {
    /** Registra um acesso ao caminho, se ele tiver um dos formatos rastreados do portal. */
    fun recordView(path: String?) {
        val normalized = normalize(path) ?: return
        pageViews.increment(TenantContext.currentTenant(), LocalDate.now(), normalized)
    }

    @Transactional(readOnly = true)
    fun summary(): MetricsSummaryResponse {
        val tenant = TenantContext.currentTenant()
        val today = LocalDate.now()
        val daily = pageViews.dailyViews(tenant, today.minusDays((CHART_DAYS - 1).toLong()))
        val dailyByDate = daily.associateBy({ it.date }, { it.views })
        return MetricsSummaryResponse(
            totalViews = pageViews.totalViews(tenant),
            viewsLast7Days = pageViews.viewsSince(tenant, today.minusDays(6)),
            viewsLast30Days = pageViews.viewsSince(tenant, today.minusDays(29)),
            // Série completa (dias sem acesso entram com zero) para o gráfico do dashboard.
            daily =
                (0 until CHART_DAYS).map { offset ->
                    val date = today.minusDays((CHART_DAYS - 1 - offset).toLong())
                    DailyViewsPoint(date, dailyByDate[date] ?: 0)
                },
            topPosts =
                pageViews
                    .topPosts(tenant, today.minusDays(29), PageRequest.of(0, TOP_POSTS))
                    .map { TopPostViews(slug = it.path.removePrefix("/posts/"), views = it.views) },
        )
    }

    /**
     * Aceita apenas os caminhos do portal público: home, listagem e páginas de leitura
     * (`/posts/slug`). Qualquer outra coisa (admin, querystrings, lixo de bot) é descartada.
     */
    private fun normalize(path: String?): String? {
        val cleaned =
            path
                ?.trim()
                ?.substringBefore('?')
                ?.trimEnd('/')
                ?.ifBlank { "/" } ?: return null
        return when {
            cleaned == "/" || cleaned == "/posts" -> cleaned
            POST_PATH.matches(cleaned) -> cleaned
            else -> null
        }
    }

    private companion object {
        const val CHART_DAYS = 14
        const val TOP_POSTS = 5
        val POST_PATH = Regex("^/posts/[a-z0-9-]{1,160}$")
    }
}
