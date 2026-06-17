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
 * Atualização parcial das integrações de IA: campo `null` mantém o valor atual; string em branco
 * limpa. Trocar de [provider] zera chave/modelo/base URL que não vierem na mesma requisição.
 */
data class AiSettingsRequest(
    val provider: AiProvider? = null,
    @field:Size(max = 255)
    val apiKey: String? = null,
    @field:Size(max = 128)
    val model: String? = null,
    @field:Size(max = 512)
    val baseUrl: String? = null,
    @field:Size(max = 255)
    val tavilyApiKey: String? = null,
    /** Geração de imagem (dedicada). Trocar [imageProvider] zera chave/modelo/base URL de imagem. */
    val imageProvider: ImageProvider? = null,
    @field:Size(max = 255)
    val imageApiKey: String? = null,
    @field:Size(max = 128)
    val imageModel: String? = null,
    @field:Size(max = 512)
    val imageBaseUrl: String? = null,
)

/** Item do catálogo de provedores de imagem exibido no painel. */
data class ImageProviderInfo(
    val id: ImageProvider,
    val label: String,
    val defaultModel: String,
    val defaultBaseUrl: String,
)

/** Item do catálogo de provedores exibido no painel. */
data class AiProviderInfo(
    val id: AiProvider,
    val label: String,
    val defaultModel: String?,
    val defaultBaseUrl: String?,
    val requiresBaseUrl: Boolean,
)

/** Estado das integrações de IA — as chaves aparecem apenas como sufixo de conferência. */
data class AiSettingsResponse(
    /** Provedor efetivo (escolhido no painel ou o padrão do servidor). */
    val provider: AiProvider,
    /** Origem da chave do LLM em uso. */
    val keySource: AiKeySource?,
    val keyHint: String?,
    /** Modelo/base URL personalizados (nulos = defaults do provedor). */
    val model: String?,
    val baseUrl: String?,
    val defaultModel: String,
    val defaultBaseUrl: String?,
    val providers: List<AiProviderInfo>,
    val tavilySource: AiKeySource?,
    val tavilyKeyHint: String?,
    /** Geração de imagem (config dedicada): provedor escolhido, dica da chave e catálogo. */
    val imageProvider: ImageProvider?,
    val imageKeyHint: String?,
    val imageModel: String?,
    val imageBaseUrl: String?,
    val imageProviders: List<ImageProviderInfo>,
)
