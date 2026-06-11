package com.gabrielaraujo.thothai.metrics

import com.gabrielaraujo.thothai.TestcontainersConfiguration
import com.gabrielaraujo.thothai.identity.UserAccount
import com.gabrielaraujo.thothai.identity.UserAccountRepository
import com.gabrielaraujo.thothai.identity.UserStatus
import com.gabrielaraujo.thothai.shared.TenantContext
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Testes das métricas multi-tenant: o caminho público carrega o handle do publicador e o
 * acesso é creditado ao tenant dele.
 */
@Import(TestcontainersConfiguration::class)
@SpringBootTest
class MetricsTests {
    @Autowired
    private lateinit var metricsService: MetricsService

    @Autowired
    private lateinit var pageViews: PageViewRepository

    @Autowired
    private lateinit var referrers: ReferrerViewRepository

    @Autowired
    private lateinit var users: UserAccountRepository

    private val browser = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0"

    @BeforeEach
    fun cleanUp() {
        pageViews.deleteAll()
        referrers.deleteAll()
        // Publicador ativo dono do handle usado nos caminhos (independente de outros testes).
        if (users.findByHandle("metrica") == null) {
            TenantContext.runAs("metrica") {
                users.save(
                    UserAccount(
                        username = "metrica",
                        passwordHash = "hash",
                        handle = "metrica",
                        status = UserStatus.ACTIVE,
                    ),
                )
            }
        }
    }

    private fun summary() = TenantContext.runAs("metrica") { metricsService.summary() }

    @Test
    fun `acumula acessos, leituras e origens no tenant do handle`() {
        repeat(3) { metricsService.record("/metrica/posts/meu-artigo", null, "https://www.linkedin.com/feed", browser) }
        metricsService.record("/metrica/posts/meu-artigo", "read", null, browser)
        metricsService.record("/metrica/posts/outro-artigo", null, "https://google.com/search", browser)
        metricsService.record("/metrica", null, null, browser)
        metricsService.record("/metrica/posts", null, null, browser)

        val summary = summary()
        assertEquals(6, summary.totalViews)
        assertEquals(6, summary.viewsLast7Days)
        assertEquals(1, summary.readsLast30Days)
        assertEquals(14, summary.daily.size)
        assertEquals(6, summary.daily.last().views)
        val top = summary.topPosts.first()
        assertEquals("meu-artigo", top.slug)
        assertEquals(3, top.views)
        assertEquals(1, top.reads)
        assertEquals(listOf("linkedin.com", "google.com"), summary.topReferrers.map { it.host })
        // Outro tenant não vê nada (isolamento RNF03).
        assertEquals(0, TenantContext.runAs("outro") { metricsService.summary() }.totalViews)
    }

    @Test
    fun `bots, handles desconhecidos, caminhos invalidos e referrer proprio sao ignorados`() {
        metricsService.record("/metrica/posts/artigo", null, null, "Googlebot/2.1 (+http://www.google.com/bot.html)")
        metricsService.record("/metrica/posts/artigo", null, null, "curl/8.0")
        metricsService.record("/nao-existe/posts/artigo", null, null, browser)
        metricsService.record("/metrica/posts/COM_MAIUSCULA", null, null, browser)
        metricsService.record("/", null, null, browser)
        metricsService.record("/metrica", "read", null, browser)
        metricsService.record("/metrica/posts/artigo-valido?x=1", null, "http://localhost:8088/metrica", browser)

        val summary = summary()
        assertEquals(1, summary.totalViews)
        assertEquals(0, summary.readsLast30Days)
        assertTrue(summary.topReferrers.isEmpty())
        assertEquals("artigo-valido", summary.topPosts.single().slug)
    }
}
