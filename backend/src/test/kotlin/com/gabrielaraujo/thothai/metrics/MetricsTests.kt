package com.gabrielaraujo.thothai.metrics

import com.gabrielaraujo.thothai.TestcontainersConfiguration
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Testes das métricas de acesso/leitura (beacon + resumo do dashboard). */
@Import(TestcontainersConfiguration::class)
@SpringBootTest
class MetricsTests {
    @Autowired
    private lateinit var metricsService: MetricsService

    @Autowired
    private lateinit var pageViews: PageViewRepository

    @Autowired
    private lateinit var referrers: ReferrerViewRepository

    private val browser = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0"

    @BeforeEach
    fun cleanUp() {
        pageViews.deleteAll()
        referrers.deleteAll()
    }

    @Test
    fun `acumula acessos, leituras e origens e resume no dashboard`() {
        repeat(3) { metricsService.record("/posts/meu-artigo", null, "https://www.linkedin.com/feed", browser) }
        metricsService.record("/posts/meu-artigo", "read", null, browser)
        metricsService.record("/posts/outro-artigo", null, "https://google.com/search", browser)
        metricsService.record("/", null, null, browser)
        metricsService.record("/posts", null, null, browser)

        val summary = metricsService.summary()
        assertEquals(6, summary.totalViews)
        assertEquals(6, summary.viewsLast7Days)
        assertEquals(1, summary.readsLast30Days)
        assertEquals(14, summary.daily.size)
        assertEquals(6, summary.daily.last().views)
        // Top posts com acessos e leituras separados.
        val top = summary.topPosts.first()
        assertEquals("meu-artigo", top.slug)
        assertEquals(3, top.views)
        assertEquals(1, top.reads)
        // Origem do tráfego sem www., ordenada por volume.
        assertEquals(listOf("linkedin.com", "google.com"), summary.topReferrers.map { it.host })
        assertEquals(3, summary.topReferrers.first().views)
    }

    @Test
    fun `bots, caminhos invalidos e referrer proprio sao ignorados`() {
        // Bots não contam.
        metricsService.record("/posts/artigo", null, null, "Googlebot/2.1 (+http://www.google.com/bot.html)")
        metricsService.record("/posts/artigo", null, null, "curl/8.0")
        // Caminhos fora do portal não contam.
        metricsService.record("/admin/posts", null, null, browser)
        metricsService.record("/posts/COM_MAIUSCULA", null, null, browser)
        // 'read' fora de página de artigo não conta.
        metricsService.record("/", "read", null, browser)
        // Referrer do próprio site (PUBLIC_ORIGIN) não vira origem.
        metricsService.record("/posts/artigo-valido?x=1", null, "http://localhost:8088/posts", browser)

        val summary = metricsService.summary()
        assertEquals(1, summary.totalViews)
        assertEquals(0, summary.readsLast30Days)
        assertTrue(summary.topReferrers.isEmpty())
        assertEquals("artigo-valido", summary.topPosts.single().slug)
    }
}
