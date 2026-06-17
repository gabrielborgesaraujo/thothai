package com.gabrielaraujo.thothai.assistant

import com.gabrielaraujo.thothai.shared.ExternalServiceException
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.web.client.body

/**
 * Cliente de embeddings no formato OpenAI (`POST {baseUrl}/embeddings`), que atende OpenAI, o
 * endpoint OpenAI-compatível do Gemini e quaisquer serviços compatíveis. Falhas viram
 * [ExternalServiceException] (RNF02). Reusa o [aiRestClient] (com timeout).
 */
@Component
internal class EmbeddingClient(
    @param:Qualifier("aiRestClient")
    private val restClient: RestClient,
) {
    fun embed(
        resolved: AiSettingsService.ResolvedEmbedding,
        input: String,
    ): List<Double> =
        try {
            val response =
                restClient
                    .post()
                    .uri("${resolved.baseUrl.trimEnd('/')}/embeddings")
                    .header("Authorization", "Bearer ${resolved.apiKey}")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(mapOf("model" to resolved.model, "input" to input))
                    .retrieve()
                    .body<EmbeddingResponse>()
            response
                ?.data
                ?.firstOrNull()
                ?.embedding
                ?.takeIf { it.isNotEmpty() }
                ?: throw IllegalStateException("Resposta de embedding vazia")
        } catch (ex: Exception) {
            throw ExternalServiceException("Falha ao gerar embedding", ex)
        }
}

internal data class EmbeddingResponse(
    val data: List<EmbeddingData> = emptyList(),
)

internal data class EmbeddingData(
    val embedding: List<Double> = emptyList(),
)
