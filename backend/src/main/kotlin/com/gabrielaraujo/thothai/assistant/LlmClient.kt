package com.gabrielaraujo.thothai.assistant

/** Abstração de um LLM, desacoplando o serviço do SDK concreto (facilita o teste). */
internal fun interface LlmClient {
    fun complete(
        system: String,
        user: String,
        maxTokens: Int,
    ): String
}
