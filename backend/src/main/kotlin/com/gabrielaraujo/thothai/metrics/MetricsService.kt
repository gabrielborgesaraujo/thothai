package com.gabrielaraujo.thothai.metrics

import com.gabrielaraujo.thothai.identity.IdentityQueries
import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.net.URI
import java.time.LocalDate

/**
 * Métricas de acesso/leitura do portal (dashboard de cada publicador). O caminho público carrega
 * o handle (`/{handle}/posts/slug`): o acesso é creditado ao tenant do publicador e armazenado
 * com o caminho relativo (sem o handle), então o dashboard de cada um só vê o que é seu (RNF03).
 * O registro é best-effort: caminhos estranhos, handles desconhecidos e bots são ignorados.
 */
@Service
@Transactional
internal class MetricsService(
    private val pageViews: PageViewRepository,
    private val referrers: ReferrerViewRepository,
    private val identity: IdentityQueries,
    @param:Value("\${thothai.public-origin}") publicOrigin: String,
) {
    private val ownHost = runCatching { URI(publicOrigin).host?.lowercase() }.getOrNull()

    /** Registra um acesso ('view') ou leitura ('read') no tenant dono do handle do caminho. */
    fun record(
        path: String?,
        metric: String?,
        referrer: String?,
        userAgent: String?,
    ) {
        if (userAgent != null && BOT_AGENT.containsMatchIn(userAgent)) {
            return
        }
        val resolved = resolve(path) ?: return
        val normalizedMetric = metric?.trim()?.lowercase().takeIf { it == "read" } ?: "view"
        // Leitura só faz sentido em páginas de artigo.
        if (normalizedMetric == "read" && !resolved.path.startsWith("/posts/")) {
            return
        }
        val today = LocalDate.now()
        pageViews.increment(resolved.tenantId, today, resolved.path, normalizedMetric)
        if (normalizedMetric == "view") {
            referrerHost(referrer)?.let { referrers.increment(resolved.tenantId, today, it) }
        }
    }

    @Transactional(readOnly = true)
    fun summary(): MetricsSummaryResponse {
        val tenant = TenantContext.currentTenant()
        val today = LocalDate.now()
        val since30 = today.minusDays(29)
        val daily = pageViews.dailyViews(tenant, today.minusDays((CHART_DAYS - 1).toLong()))
        val dailyByDate = daily.associateBy({ it.date }, { it.views })
        val topViews = pageViews.topPosts(tenant, "view", since30, PageRequest.of(0, TOP_POSTS))
        val readsBySlug =
            pageViews
                .topPosts(tenant, "read", since30, PageRequest.of(0, READS_LOOKUP))
                .associateBy({ it.path }, { it.views })
        return MetricsSummaryResponse(
            totalViews = pageViews.totalViews(tenant, "view"),
            viewsLast7Days = pageViews.viewsSince(tenant, "view", today.minusDays(6)),
            viewsLast30Days = pageViews.viewsSince(tenant, "view", since30),
            readsLast30Days = pageViews.viewsSince(tenant, "read", since30),
            // Série completa (dias sem acesso entram com zero) para o gráfico do dashboard.
            daily =
                (0 until CHART_DAYS).map { offset ->
                    val date = today.minusDays((CHART_DAYS - 1 - offset).toLong())
                    DailyViewsPoint(date, dailyByDate[date] ?: 0)
                },
            topPosts =
                topViews.map {
                    TopPostViews(
                        slug = it.path.removePrefix("/posts/"),
                        views = it.views,
                        reads = readsBySlug[it.path] ?: 0,
                    )
                },
            topReferrers =
                referrers
                    .topHosts(tenant, since30, PageRequest.of(0, TOP_REFERRERS))
                    .map { ReferrerViews(host = it.host, views = it.views) },
        )
    }

    private data class ResolvedPath(
        val tenantId: String,
        val path: String,
    )

    /**
     * Resolve `/{handle}[/posts[/slug]]` para (tenant do publicador, caminho relativo).
     * A landing da plataforma ('/') e handles desconhecidos não contam.
     */
    private fun resolve(path: String?): ResolvedPath? {
        val cleaned = path?.trim()?.substringBefore('?')?.trimEnd('/') ?: return null
        val match = PUBLISHER_PATH.find(cleaned) ?: return null
        val handle = match.groupValues[1]
        val rest = match.groupValues[2].ifBlank { "/" }
        if (rest != "/" && rest != "/posts" && !POST_PATH.matches(rest)) {
            return null
        }
        val tenant = identity.tenantForHandle(handle) ?: return null
        return ResolvedPath(tenant, rest)
    }

    /** Host do referrer externo (minúsculo, sem `www.`); o próprio site e lixo são descartados. */
    private fun referrerHost(referrer: String?): String? {
        val host =
            runCatching { URI(referrer?.trim().orEmpty()).host }
                .getOrNull()
                ?.lowercase()
                ?.removePrefix("www.")
                ?.take(160)
                ?.takeIf { it.isNotBlank() }
                ?: return null
        return host.takeIf { it != ownHost && it != ownHost?.removePrefix("www.") }
    }

    private companion object {
        const val CHART_DAYS = 14
        const val TOP_POSTS = 5
        const val TOP_REFERRERS = 5
        const val READS_LOOKUP = 50
        val PUBLISHER_PATH = Regex("^/([a-z0-9-]{1,64})(/.*)?$")
        val POST_PATH = Regex("^/posts/[a-z0-9-]{1,160}$")
        val BOT_AGENT =
            Regex(
                "(?i)bot|crawl|spider|slurp|curl|wget|python-requests|headless|preview|monitor|pingdom|lighthouse|facebookexternalhit|whatsapp|telegram",
            )
    }
}
