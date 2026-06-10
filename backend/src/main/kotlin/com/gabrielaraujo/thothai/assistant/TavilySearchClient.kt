package com.gabrielaraujo.thothai.assistant

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.web.client.body

/**
 * [SearchClient] sobre a API do Tavily, com a chave resolvida a cada chamada ([AiSettingsService]:
 * banco > ambiente). A busca é **best-effort** (RF04/RNF02): se a chave não estiver configurada ou a
 * chamada falhar, retorna lista vazia e o rascunho é gerado apenas a partir do tema.
 */
@Component
internal class TavilySearchClient(
    @param:org.springframework.beans.factory.annotation.Qualifier("tavilyRestClient")
    private val restClient: RestClient,
    private val settings: AiSettingsService,
) : SearchClient {
    private val log = LoggerFactory.getLogger(javaClass)

    override fun search(query: String): List<SearchResult> {
        val apiKey = settings.resolveTavilyKey()
        if (apiKey.isBlank()) {
            return emptyList()
        }
        return try {
            val body =
                mapOf(
                    "api_key" to apiKey,
                    "query" to query,
                    "max_results" to 5,
                    "search_depth" to "basic",
                )
            val response =
                restClient
                    .post()
                    .uri("/search")
                    .body(body)
                    .retrieve()
                    .body<TavilyResponse>()
            response?.results.orEmpty().mapNotNull { result ->
                result.url?.let { SearchResult(result.title ?: "", it, result.content ?: "") }
            }
        } catch (ex: Exception) {
            log.warn("Busca viva indisponível: {}", ex.message)
            emptyList()
        }
    }
}

internal data class TavilyResponse(
    val results: List<TavilyResult> = emptyList(),
)

internal data class TavilyResult(
    val title: String? = null,
    val url: String? = null,
    val content: String? = null,
)
