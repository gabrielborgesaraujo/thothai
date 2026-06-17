package com.gabrielaraujo.thothai.assistant

import com.gabrielaraujo.thothai.shared.InvalidRequestException
import org.junit.jupiter.api.Test
import tools.jackson.databind.json.JsonMapper
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * Teste unitário puro (sem Spring/Docker) das regras do assistente de IA (RF04/RF05), com
 * [LlmClient] e [SearchClient] falsos.
 */
class AssistantServiceTest {
    private val mapper = JsonMapper.builder().build()

    private fun service(
        llm: LlmClient,
        search: SearchClient = SearchClient { emptyList() },
    ) = AssistantService(llm, search, mapper)

    @Test
    fun `gera rascunho a partir do formato delimitado`() {
        val resposta =
            """
            TITULO: Mudanças do Angular 21
            RESUMO: O Angular 21 consolida os Signals como o "mindset padrão" do framework.
            CONTEUDO:
            ## Destaques

            Os Signals viram o "mindset padrão" [^1] — aspas e Markdown livres, sem escaping.

            [^1]: fonte
            """.trimIndent()
        val svc = service(llm = { _, _, _ -> resposta })

        val draft = svc.generateDraft("angular 21")

        assertEquals("Mudanças do Angular 21", draft.title)
        assertEquals("O Angular 21 consolida os Signals como o \"mindset padrão\" do framework.", draft.summary)
        assertTrue(draft.body.startsWith("## Destaques"))
        assertTrue(draft.body.contains("\"mindset padrão\""))
        assertTrue(!draft.body.contains("TITULO:"))
    }

    @Test
    fun `formato delimitado dentro de cerca de codigo tambem e aceito`() {
        val resposta = "```\nTITULO: Post\nRESUMO: Resumo curto.\nCONTEUDO:\nCorpo do artigo.\n```"
        val svc = service(llm = { _, _, _ -> resposta })

        val draft = svc.generateDraft("tema")

        assertEquals("Post", draft.title)
        assertEquals("Resumo curto.", draft.summary)
        assertEquals("Corpo do artigo.", draft.body)
    }

    @Test
    fun `gera rascunho a partir do JSON do LLM`() {
        val svc =
            service(
                llm = { _, _, _ -> """Aqui: {"title":"Kotlin","summary":"Resumo","body":"# Corpo"} fim""" },
            )

        val draft = svc.generateDraft("kotlin")

        assertEquals("Kotlin", draft.title)
        assertEquals("Resumo", draft.summary)
        assertEquals("# Corpo", draft.body)
    }

    @Test
    fun `instrucao do autor e injetada no prompt do rascunho`() {
        var capturedUser = ""
        val svc =
            service(
                llm = { _, user, _ ->
                    capturedUser = user
                    "TITULO: T\nRESUMO: R\nCONTEUDO:\nCorpo."
                },
            )

        svc.generateDraft("kotlin", instructions = "Use tom informal e foco em iniciantes")

        assertTrue(capturedUser.contains("Instruções do autor"))
        assertTrue(capturedUser.contains("tom informal e foco em iniciantes"))
    }

    @Test
    fun `usa fallback quando o LLM nao retorna JSON`() {
        val svc = service(llm = { _, _, _ -> "texto cru sem json" })

        val draft = svc.generateDraft("meu tema")

        assertEquals("meu tema", draft.title)
        assertEquals("texto cru sem json", draft.body)
        assertNull(draft.summary)
    }

    @Test
    fun `falha na busca nao quebra a geracao e inclui as fontes`() {
        val explodingSearch = SearchClient { throw RuntimeException("tavily fora do ar") }
        val svc = service(llm = { _, _, _ -> """{"body":"# Ok"}""" }, search = explodingSearch)

        val draft = svc.generateDraft("tema")

        assertEquals("# Ok", draft.body)
        assertTrue(draft.sources.isEmpty())
    }

    @Test
    fun `revisao parseia o array de recomendacoes`() {
        val svc = service(llm = { _, _, _ -> """["Corrija o acento","Use crase"]""" })

        val review = svc.review("texto com erros")

        assertEquals(listOf("Corrija o acento", "Use crase"), review.recommendations)
    }

    @Test
    fun `tema vazio e rejeitado`() {
        val svc = service(llm = { _, _, _ -> "" })
        assertFailsWith<InvalidRequestException> { svc.generateDraft("   ") }
    }

    @Test
    fun `conteudo vazio para revisao e rejeitado`() {
        val svc = service(llm = { _, _, _ -> "" })
        assertFailsWith<InvalidRequestException> { svc.review("") }
    }

    @Test
    fun `correcao aplicavel devolve o texto sem cercas de codigo`() {
        val svc = service(llm = { _, _, _ -> "```\n## Corrigido\n\nTexto sem erros.\n```" })

        val corrected = svc.applyReview("## Coregido\n\nTexto com eros.")

        assertEquals("## Corrigido\n\nTexto sem erros.", corrected.text)
    }

    @Test
    fun `gera isca para linkedin a partir do texto do LLM`() {
        val svc = service(llm = { _, _, _ -> "Gancho! Leia o artigo completo no portal." })

        val snippet = svc.generateSnippet("Título", "corpo")

        assertEquals("Gancho! Leia o artigo completo no portal.", snippet.text)
    }

    @Test
    fun `isca sem titulo e sem conteudo e rejeitada`() {
        val svc = service(llm = { _, _, _ -> "" })
        assertFailsWith<InvalidRequestException> { svc.generateSnippet("  ", "  ") }
    }
}
