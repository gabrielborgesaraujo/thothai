package com.gabrielaraujo.thothai.assistant

/** Resultado de busca viva (RF04). */
internal data class SearchResult(
    val title: String,
    val url: String,
    val content: String,
)

/** Abstração da busca viva na web. */
internal fun interface SearchClient {
    fun search(query: String): List<SearchResult>
}
