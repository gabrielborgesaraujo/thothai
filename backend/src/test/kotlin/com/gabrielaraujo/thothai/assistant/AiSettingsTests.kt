package com.gabrielaraujo.thothai.assistant

import com.gabrielaraujo.thothai.TestcontainersConfiguration
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull

/** Testes das chaves de IA configuráveis pelo usuário (banco > variáveis de ambiente). */
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
    fun `sem registro no banco cai no fallback de ambiente`() {
        val state = service.get()
        assertEquals(AiKeySource.ENVIRONMENT, state.anthropicSource)
        assertNull(state.tavilySource)

        val resolved = service.resolveClaude()
        assertEquals("env-claude-key", resolved.apiKey)
        assertEquals("claude-modelo-padrao", resolved.model)
        assertEquals("", service.resolveTavilyKey())
    }

    @Test
    fun `chave do painel tem precedencia e retorna apenas o sufixo`() {
        val state =
            service.update(
                AiSettingsRequest(
                    anthropicApiKey = "sk-ant-minha-chave-9876",
                    anthropicModel = "claude-fable-5",
                    tavilyApiKey = "tvly-abcd",
                ),
            )

        assertEquals(AiKeySource.CUSTOM, state.anthropicSource)
        assertEquals("••••9876", state.anthropicKeyHint)
        assertEquals("claude-fable-5", state.anthropicModel)
        assertEquals(AiKeySource.CUSTOM, state.tavilySource)
        assertFalse(state.anthropicKeyHint!!.contains("minha-chave"))

        val resolved = service.resolveClaude()
        assertEquals("sk-ant-minha-chave-9876", resolved.apiKey)
        assertEquals("claude-fable-5", resolved.model)
        assertEquals("tvly-abcd", service.resolveTavilyKey())
    }

    @Test
    fun `atualizacao parcial mantem campos nulos e string vazia limpa`() {
        service.update(AiSettingsRequest(anthropicApiKey = "sk-1111", tavilyApiKey = "tvly-2222"))

        // null mantém a chave Anthropic; "" limpa a do Tavily.
        val state = service.update(AiSettingsRequest(tavilyApiKey = ""))
        assertEquals(AiKeySource.CUSTOM, state.anthropicSource)
        assertNull(state.tavilySource)
        assertEquals("sk-1111", service.resolveClaude().apiKey)

        // Limpar a Anthropic volta ao fallback de ambiente.
        val cleared = service.update(AiSettingsRequest(anthropicApiKey = ""))
        assertEquals(AiKeySource.ENVIRONMENT, cleared.anthropicSource)
        assertEquals("env-claude-key", service.resolveClaude().apiKey)
        assertEquals("claude-modelo-padrao", service.resolveClaude().model)
    }
}
