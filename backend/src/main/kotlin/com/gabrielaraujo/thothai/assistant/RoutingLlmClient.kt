package com.gabrielaraujo.thothai.assistant

import com.gabrielaraujo.thothai.shared.InvalidRequestException
import org.springframework.stereotype.Component

/**
 * [LlmClient] que resolve o provedor efetivo a cada chamada ([AiSettingsService]: banco >
 * ambiente) e roteia para o cliente adequado — SDK Anthropic ou HTTP OpenAI-compatível.
 * Trocar de provedor/chave no painel vale na hora, sem reiniciar.
 */
@Component
internal class RoutingLlmClient(
    private val settings: AiSettingsService,
    private val anthropic: AnthropicChatClient,
    private val openAiCompatible: OpenAiCompatibleChatClient,
) : LlmClient {
    override fun complete(
        system: String,
        user: String,
        maxTokens: Int,
    ): String {
        val resolved = settings.resolve()
        if (resolved.apiKey.isBlank()) {
            throw InvalidRequestException(
                "Assistente de IA não configurado — informe sua chave em Integrações",
            )
        }
        if (resolved.model.isBlank()) {
            throw InvalidRequestException("Informe o modelo do provedor de IA em Integrações")
        }
        return when (resolved.provider) {
            AiProvider.ANTHROPIC -> anthropic.complete(resolved, system, user, maxTokens)
            else -> openAiCompatible.complete(resolved, system, user, maxTokens)
        }
    }
}
