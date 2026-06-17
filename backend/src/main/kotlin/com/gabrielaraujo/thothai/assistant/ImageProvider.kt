package com.gabrielaraujo.thothai.assistant

/**
 * Provedores de **geração de imagem** suportados, configurados de forma dedicada (independente do
 * provedor de texto). Cada um expõe um endpoint próprio; o cliente decide o formato da requisição
 * a partir do provedor escolhido.
 */
enum class ImageProvider(
    val label: String,
    val defaultModel: String,
    val defaultBaseUrl: String,
) {
    OPENAI("OpenAI (gpt-image)", "gpt-image-1", "https://api.openai.com/v1"),
    GEMINI("Google (Imagen)", "imagen-3.0-generate-002", "https://generativelanguage.googleapis.com/v1beta"),
}
