package com.gabrielaraujo.thothai.assistant

import com.anthropic.client.AnthropicClient
import com.anthropic.client.okhttp.AnthropicOkHttpClient
import com.anthropic.models.messages.MessageCreateParams
import com.gabrielaraujo.thothai.shared.ExternalServiceException
import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap
import kotlin.jvm.optionals.getOrNull

/**
 * Chamada de chat à API da Anthropic (SDK oficial), usada pelo [RoutingLlmClient] quando o
 * provedor efetivo é [AiProvider.ANTHROPIC]. Falha de comunicação → [ExternalServiceException]
 * para não derrubar o painel (RNF02).
 */
@Component
internal class AnthropicChatClient(
    private val properties: AiProperties,
) {
    /** Clientes por chave: troca de chave no painel passa a usar um cliente novo sem reinício. */
    private val clients = ConcurrentHashMap<String, AnthropicClient>()

    fun complete(
        resolved: AiSettingsService.ResolvedAi,
        system: String,
        user: String,
        maxTokens: Int,
    ): String =
        try {
            val params =
                MessageCreateParams
                    .builder()
                    .model(resolved.model)
                    .maxTokens(maxTokens.toLong())
                    .system(system)
                    .addUserMessage(user)
                    .build()
            clientFor(resolved.apiKey, resolved.baseUrl)
                .messages()
                .create(params)
                .content()
                .mapNotNull { it.text().getOrNull()?.text() }
                .joinToString("\n")
                .trim()
        } catch (ex: Exception) {
            throw ExternalServiceException("Falha ao consultar o assistente de IA", ex)
        }

    private fun clientFor(
        apiKey: String,
        baseUrl: String,
    ): AnthropicClient {
        // Mantém no máximo o cliente da chave corrente (single-publisher): limpa trocas antigas.
        if (clients.size > 4) {
            clients.clear()
        }
        return clients.computeIfAbsent("$apiKey|$baseUrl") {
            AnthropicOkHttpClient
                .builder()
                .apiKey(apiKey)
                .baseUrl(baseUrl.ifBlank { "https://api.anthropic.com" })
                .timeout(properties.timeout)
                .build()
        }
    }
}
