package com.gabrielaraujo.thothai.assistant

import com.anthropic.client.AnthropicClient
import com.anthropic.client.okhttp.AnthropicOkHttpClient
import com.anthropic.models.messages.MessageCreateParams
import com.gabrielaraujo.thothai.shared.ExternalServiceException
import com.gabrielaraujo.thothai.shared.InvalidRequestException
import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap
import kotlin.jvm.optionals.getOrNull

/**
 * [LlmClient] sobre o SDK oficial Anthropic (Claude). A chave/modelo são resolvidos a cada chamada
 * ([AiSettingsService]: banco > ambiente), permitindo configurar pelo painel sem reiniciar.
 * Chave em branco → [InvalidRequestException]; falha de comunicação → [ExternalServiceException] (RNF02).
 */
@Component
internal class ClaudeLlmClient(
    private val settings: AiSettingsService,
    private val properties: AiProperties,
) : LlmClient {
    /** Clientes por chave: troca de chave no painel passa a usar um cliente novo sem reinício. */
    private val clients = ConcurrentHashMap<String, AnthropicClient>()

    override fun complete(
        system: String,
        user: String,
        maxTokens: Int,
    ): String {
        val resolved = settings.resolveClaude()
        if (resolved.apiKey.isBlank()) {
            throw InvalidRequestException(
                "Assistente de IA não configurado — informe sua chave Anthropic em Integrações",
            )
        }
        return try {
            val params =
                MessageCreateParams
                    .builder()
                    .model(resolved.model)
                    .maxTokens(maxTokens.toLong())
                    .system(system)
                    .addUserMessage(user)
                    .build()
            clientFor(resolved.apiKey)
                .messages()
                .create(params)
                .content()
                .mapNotNull { it.text().getOrNull()?.text() }
                .joinToString("\n")
                .trim()
        } catch (ex: Exception) {
            throw ExternalServiceException("Falha ao consultar o assistente de IA", ex)
        }
    }

    private fun clientFor(apiKey: String): AnthropicClient {
        // Mantém no máximo o cliente da chave corrente (single-publisher): limpa trocas antigas.
        if (clients.size > 4) {
            clients.clear()
        }
        return clients.computeIfAbsent(apiKey) {
            AnthropicOkHttpClient
                .builder()
                .apiKey(apiKey)
                .baseUrl(properties.claude.baseUrl)
                .timeout(properties.timeout)
                .build()
        }
    }
}
