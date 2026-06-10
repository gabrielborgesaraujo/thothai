package com.gabrielaraujo.thothai.assistant

import com.gabrielaraujo.thothai.shared.ExternalServiceException
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.web.client.body

/**
 * Chamada de chat no formato OpenAI (`/chat/completions`), que atende OpenAI, Gemini e Qwen
 * (endpoints compatíveis oficiais) e qualquer serviço OpenAI-compatível (DeepSeek, Groq, Ollama…).
 * A base URL vem da configuração efetiva; falhas → [ExternalServiceException] (RNF02).
 */
@Component
internal class OpenAiCompatibleChatClient(
    @param:Qualifier("aiRestClient")
    private val restClient: RestClient,
) {
    fun complete(
        resolved: AiSettingsService.ResolvedAi,
        system: String,
        user: String,
        maxTokens: Int,
    ): String {
        val body =
            buildMap<String, Any> {
                put("model", resolved.model)
                put(
                    "messages",
                    listOf(
                        mapOf("role" to "system", "content" to system),
                        mapOf("role" to "user", "content" to user),
                    ),
                )
                // A OpenAI aposentou max_tokens nos modelos atuais; os compatíveis ainda o usam.
                if (resolved.provider == AiProvider.OPENAI) {
                    put("max_completion_tokens", maxTokens)
                } else {
                    put("max_tokens", maxTokens)
                }
            }
        return try {
            val response =
                restClient
                    .post()
                    .uri("${resolved.baseUrl.trimEnd('/')}/chat/completions")
                    .header("Authorization", "Bearer ${resolved.apiKey}")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body<ChatCompletionResponse>()
            response
                ?.choices
                ?.firstOrNull()
                ?.message
                ?.content
                ?.trim()
                ?.takeIf { it.isNotBlank() }
                ?: throw IllegalStateException("Resposta vazia do provedor de IA")
        } catch (ex: Exception) {
            throw ExternalServiceException("Falha ao consultar o assistente de IA", ex)
        }
    }
}

internal data class ChatCompletionResponse(
    val choices: List<ChatChoice> = emptyList(),
)

internal data class ChatChoice(
    val message: ChatMessage? = null,
)

internal data class ChatMessage(
    val content: String? = null,
)
