package com.gabrielaraujo.thothai.assistant

import com.gabrielaraujo.thothai.TestcontainersConfiguration
import com.gabrielaraujo.thothai.shared.InvalidRequestException
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull

/** Testes das integrações de IA multi-provider configuráveis pelo usuário (banco > ambiente). */
@Import(TestcontainersConfiguration::class)
@SpringBootTest(
    properties = [
        "thothai.ai.claude.api-key=env-claude-key",
        "thothai.ai.claude.model=claude-modelo-padrao",
        "thothai.search.tavily.api-key=",
    ],
)
class AiSettingsTests {
    @Autowired
    private lateinit var service: AiSettingsService

    @Autowired
    private lateinit var repository: AiSettingsRepository

    @BeforeEach
    fun cleanUp() {
        repository.deleteAll()
    }

    @Test
    fun `sem registro no banco usa Anthropic com fallback de ambiente`() {
        val state = service.get()
        assertEquals(AiProvider.ANTHROPIC, state.provider)
        assertEquals(AiKeySource.ENVIRONMENT, state.keySource)
        assertEquals("claude-modelo-padrao", state.defaultModel)
        assertEquals(AiProvider.entries.size, state.providers.size)
        assertNull(state.tavilySource)

        val resolved = service.resolve()
        assertEquals(AiProvider.ANTHROPIC, resolved.provider)
        assertEquals("env-claude-key", resolved.apiKey)
        assertEquals("claude-modelo-padrao", resolved.model)
        assertEquals("", service.resolveTavilyKey())
    }

    @Test
    fun `provedor proprio com chave retorna apenas o sufixo e usa defaults do catalogo`() {
        val state =
            service.update(
                AiSettingsRequest(provider = AiProvider.OPENAI, apiKey = "sk-openai-9876"),
            )

        assertEquals(AiProvider.OPENAI, state.provider)
        assertEquals(AiKeySource.CUSTOM, state.keySource)
        assertEquals("••••9876", state.keyHint)
        assertFalse(state.keyHint!!.contains("openai"))
        assertEquals("gpt-5.1", state.defaultModel)
        assertEquals("https://api.openai.com/v1", state.defaultBaseUrl)

        val resolved = service.resolve()
        assertEquals(AiProvider.OPENAI, resolved.provider)
        assertEquals("sk-openai-9876", resolved.apiKey)
        assertEquals("gpt-5.1", resolved.model)
        assertEquals("https://api.openai.com/v1", resolved.baseUrl)
    }

    @Test
    fun `trocar de provedor descarta chave e modelo anteriores`() {
        service.update(
            AiSettingsRequest(provider = AiProvider.OPENAI, apiKey = "sk-openai", model = "gpt-x"),
        )

        val state = service.update(AiSettingsRequest(provider = AiProvider.GEMINI))
        assertEquals(AiProvider.GEMINI, state.provider)
        assertNull(state.keySource)
        assertNull(state.model)
        assertEquals("gemini-2.5-flash", state.defaultModel)

        // Voltar para Anthropic sem chave própria reativa o fallback de ambiente.
        val anthropic = service.update(AiSettingsRequest(provider = AiProvider.ANTHROPIC))
        assertEquals(AiKeySource.ENVIRONMENT, anthropic.keySource)
        assertEquals("env-claude-key", service.resolve().apiKey)
    }

    @Test
    fun `modo OpenAI-compativel exige base URL`() {
        assertFailsWith<InvalidRequestException> {
            service.update(
                AiSettingsRequest(provider = AiProvider.OPENAI_COMPATIBLE, apiKey = "chave"),
            )
        }

        val state =
            service.update(
                AiSettingsRequest(
                    provider = AiProvider.OPENAI_COMPATIBLE,
                    apiKey = "chave",
                    model = "deepseek-chat",
                    baseUrl = "https://api.deepseek.com/v1/",
                ),
            )
        // Barra final normalizada.
        assertEquals("https://api.deepseek.com/v1", state.baseUrl)
        assertEquals("deepseek-chat", service.resolve().model)
    }

    @Test
    fun `atualizacao parcial mantem campos nulos e string vazia limpa`() {
        service.update(
            AiSettingsRequest(provider = AiProvider.QWEN, apiKey = "qwen-1111", tavilyApiKey = "tvly-2222"),
        )

        // null mantém a chave do LLM; "" limpa a do Tavily.
        val state = service.update(AiSettingsRequest(tavilyApiKey = ""))
        assertEquals(AiKeySource.CUSTOM, state.keySource)
        assertNull(state.tavilySource)
        assertEquals("qwen-1111", service.resolve().apiKey)
        assertEquals("qwen-plus", service.resolve().model)
    }
}
