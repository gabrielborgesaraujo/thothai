package com.gabrielaraujo.thothai.metrics

import com.gabrielaraujo.thothai.TestcontainersConfiguration
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import kotlin.test.assertEquals

/** Testes das métricas de acesso (beacon + resumo do dashboard). */
@Import(TestcontainersConfiguration::class)
@SpringBootTest
class MetricsTests {
    @Autowired
    private lateinit var metricsService: MetricsService

    @Autowired
    private lateinit var pageViews: PageViewRepository

    @BeforeEach
    fun cleanUp() {
        pageViews.deleteAll()
    }

    @Test
    fun `acumula acessos por caminho e resume no dashboard`() {
        repeat(3) { metricsService.recordView("/posts/meu-artigo") }
        metricsService.recordView("/posts/outro-artigo")
        metricsService.recordView("/")
        metricsService.recordView("/posts")

        val summary = metricsService.summary()
        assertEquals(6, summary.totalViews)
        assertEquals(6, summary.viewsLast7Days)
        assertEquals(6, summary.viewsLast30Days)
        // Série diária cobre 14 dias, com o total de hoje no último ponto.
        assertEquals(14, summary.daily.size)
        assertEquals(6, summary.daily.last().views)
        assertEquals(0, summary.daily.first().views)
        // Top posts ordenado por acessos, só páginas de leitura.
        assertEquals(listOf("meu-artigo", "outro-artigo"), summary.topPosts.map { it.slug })
        assertEquals(3, summary.topPosts.first().views)
    }

    @Test
    fun `caminhos fora do portal sao ignorados`() {
        metricsService.recordView("/admin/posts")
        metricsService.recordView("/posts/COM_MAIUSCULA")
        metricsService.recordView("/qualquer-coisa")
        metricsService.recordView(null)
        // Querystring é descartada; barra final normalizada.
        metricsService.recordView("/posts/artigo-valido?tag=x")
        metricsService.recordView("/posts/artigo-valido/")

        val summary = metricsService.summary()
        assertEquals(2, summary.totalViews)
        assertEquals("artigo-valido", summary.topPosts.single().slug)
    }
}
