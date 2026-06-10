package com.gabrielaraujo.thothai.assistant

import jakarta.validation.constraints.Size

/** Origem efetiva de uma chave de IA. */
enum class AiKeySource {
    /** Chave configurada pelo usuário no painel (banco). */
    CUSTOM,

    /** Chave herdada das variáveis de ambiente do servidor. */
    ENVIRONMENT,
}

/**
 * Atualização parcial das chaves de IA: campo `null` mantém o valor atual;
 * string em branco limpa e volta ao fallback de ambiente.
 */
data class AiSettingsRequest(
    @field:Size(max = 255)
    val anthropicApiKey: String? = null,
    @field:Size(max = 128)
    val anthropicModel: String? = null,
    @field:Size(max = 255)
    val tavilyApiKey: String? = null,
)

/** Estado das integrações de IA — as chaves aparecem apenas como sufixo de conferência. */
data class AiSettingsResponse(
    val anthropicSource: AiKeySource?,
    val anthropicKeyHint: String?,
    val anthropicModel: String?,
    val defaultModel: String,
    val tavilySource: AiKeySource?,
    val tavilyKeyHint: String?,
)
