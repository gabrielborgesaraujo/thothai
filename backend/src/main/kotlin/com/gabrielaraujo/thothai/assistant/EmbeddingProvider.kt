package com.gabrielaraujo.thothai.assistant

/**
 * Provedores de **embeddings** (memória do autor / RAG), config dedicada. Todos falam o formato
 * OpenAI (`POST {baseUrl}/embeddings`) — inclusive o endpoint OpenAI-compatível do Gemini —, então
 * um único cliente atende a todos.
 */
enum class EmbeddingProvider(
    val label: String,
    val defaultModel: String,
    val defaultBaseUrl: String,
    val requiresBaseUrl: Boolean = false,
) {
    OPENAI("OpenAI", "text-embedding-3-small", "https://api.openai.com/v1"),
    GEMINI(
        "Google (Gemini)",
        "text-embedding-004",
        "https://generativelanguage.googleapis.com/v1beta/openai",
    ),
    OPENAI_COMPATIBLE("OpenAI-compatível (outro)", "", "", requiresBaseUrl = true),
}
