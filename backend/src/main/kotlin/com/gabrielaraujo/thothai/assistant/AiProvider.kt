package com.gabrielaraujo.thothai.assistant

/**
 * Provedores de LLM suportados. Com exceção da Anthropic (SDK próprio), todos são atendidos
 * pelo cliente HTTP OpenAI-compatível ([OpenAiCompatibleChatClient]) — inclusive Gemini e Qwen,
 * que expõem endpoints nesse formato. [OPENAI_COMPATIBLE] cobre qualquer outro serviço
 * compatível (DeepSeek, Groq, Ollama…), com a base URL informada pelo usuário.
 */
enum class AiProvider(
    val label: String,
    val defaultModel: String?,
    val defaultBaseUrl: String?,
    val requiresBaseUrl: Boolean = false,
) {
    ANTHROPIC("Anthropic (Claude)", null, null),
    OPENAI("OpenAI (GPT)", "gpt-5.1", "https://api.openai.com/v1"),
    GEMINI("Google (Gemini)", "gemini-2.5-flash", "https://generativelanguage.googleapis.com/v1beta/openai"),
    QWEN("Alibaba (Qwen)", "qwen-plus", "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"),
    OPENAI_COMPATIBLE("OpenAI-compatível (outro)", null, null, requiresBaseUrl = true),
}
