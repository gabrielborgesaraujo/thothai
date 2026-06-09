package com.gabrielaraujo.thothai.assistant

import com.anthropic.client.AnthropicClient
import com.anthropic.models.messages.MessageCreateParams
import com.gabrielaraujo.thothai.shared.ExternalServiceException
import com.gabrielaraujo.thothai.shared.InvalidRequestException
import org.springframework.stereotype.Component
import kotlin.jvm.optionals.getOrNull

/**
 * [LlmClient] sobre o SDK oficial Anthropic (Claude). Chave em branco → [InvalidRequestException];
 * qualquer falha de comunicação → [ExternalServiceException], para não derrubar o painel (RNF02).
 */
@Component
internal class ClaudeLlmClient(
    private val client: AnthropicClient,
    private val properties: AiProperties,
) : LlmClient {
    override fun complete(
        system: String,
        user: String,
        maxTokens: Int,
    ): String {
        if (properties.claude.apiKey.isBlank()) {
            throw InvalidRequestException("Assistente de IA não configurado (defina ANTHROPIC_API_KEY)")
        }
        return try {
            val params =
                MessageCreateParams
                    .builder()
                    .model(properties.claude.model)
                    .maxTokens(maxTokens.toLong())
                    .system(system)
                    .addUserMessage(user)
                    .build()
            client
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
}
