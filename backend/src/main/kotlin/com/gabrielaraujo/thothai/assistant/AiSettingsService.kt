package com.gabrielaraujo.thothai.assistant

import com.gabrielaraujo.thothai.shared.InvalidRequestException
import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * Gestão das integrações de IA configuradas pelo usuário (painel) e resolução efetiva: o que está
 * no banco tem precedência; em branco, cai nas variáveis de ambiente (Anthropic/Tavily). As chaves
 * nunca saem inteiras pela API — apenas um sufixo de conferência.
 */
@Service
@Transactional
internal class AiSettingsService(
    private val repository: AiSettingsRepository,
    private val aiProperties: AiProperties,
    private val searchProperties: SearchProperties,
) {
    /** Configuração efetiva do LLM para uma chamada (provider + chave + modelo + base URL). */
    internal data class ResolvedAi(
        val provider: AiProvider,
        val apiKey: String,
        val model: String,
        val baseUrl: String,
    )

    /** Configuração efetiva da geração de imagem (config dedicada, sem fallback de ambiente). */
    internal data class ResolvedImage(
        val provider: ImageProvider,
        val apiKey: String,
        val model: String,
        val baseUrl: String,
    )

    /** Configuração efetiva de embeddings (memória do autor); nula quando não configurada. */
    internal data class ResolvedEmbedding(
        val apiKey: String,
        val model: String,
        val baseUrl: String,
    )

    @Transactional(readOnly = true)
    fun get(): AiSettingsResponse = toResponse(find())

    /**
     * Atualização parcial: campo `null` mantém o valor atual; string em branco limpa. Trocar de
     * provedor descarta chave/modelo/base URL anteriores (são específicos de cada provedor).
     */
    fun update(request: AiSettingsRequest): AiSettingsResponse {
        val settings = find() ?: AiSettings()
        if (request.provider != null && request.provider != settings.provider) {
            settings.provider = request.provider
            settings.apiKey = null
            settings.model = null
            settings.baseUrl = null
        }
        request.apiKey?.let { settings.apiKey = it.trim().ifBlank { null } }
        request.model?.let { settings.model = it.trim().ifBlank { null } }
        request.baseUrl?.let { settings.baseUrl = it.trim().trimEnd('/').ifBlank { null } }
        request.tavilyApiKey?.let { settings.tavilyApiKey = it.trim().ifBlank { null } }

        // Geração de imagem (dedicada): trocar de provedor descarta chave/modelo/base URL anteriores.
        if (request.imageProvider != null && request.imageProvider != settings.imageProvider) {
            settings.imageProvider = request.imageProvider
            settings.imageApiKey = null
            settings.imageModel = null
            settings.imageBaseUrl = null
        }
        request.imageApiKey?.let { settings.imageApiKey = it.trim().ifBlank { null } }
        request.imageModel?.let { settings.imageModel = it.trim().ifBlank { null } }
        request.imageBaseUrl?.let { settings.imageBaseUrl = it.trim().trimEnd('/').ifBlank { null } }

        // Embeddings (memória do autor): trocar de provedor descarta chave/modelo/base URL anteriores.
        if (request.embeddingProvider != null && request.embeddingProvider != settings.embeddingProvider) {
            settings.embeddingProvider = request.embeddingProvider
            settings.embeddingApiKey = null
            settings.embeddingModel = null
            settings.embeddingBaseUrl = null
        }
        request.embeddingApiKey?.let { settings.embeddingApiKey = it.trim().ifBlank { null } }
        request.embeddingModel?.let { settings.embeddingModel = it.trim().ifBlank { null } }
        request.embeddingBaseUrl?.let { settings.embeddingBaseUrl = it.trim().trimEnd('/').ifBlank { null } }

        val provider = settings.provider ?: AiProvider.ANTHROPIC
        if (provider.requiresBaseUrl && settings.baseUrl == null) {
            throw InvalidRequestException("Informe a base URL da API OpenAI-compatível")
        }
        return toResponse(repository.save(settings))
    }

    /** Provider + chave + modelo + base URL efetivos (banco > ambiente > defaults do provedor). */
    @Transactional(readOnly = true)
    fun resolve(): ResolvedAi {
        val settings = find()
        val provider = settings?.provider ?: AiProvider.ANTHROPIC
        return ResolvedAi(
            provider = provider,
            apiKey = settings?.apiKey ?: envKeyFor(provider),
            model = settings?.model ?: defaultModelFor(provider).orEmpty(),
            baseUrl = settings?.baseUrl ?: defaultBaseUrlFor(provider).orEmpty(),
        )
    }

    /** Chave efetiva do Tavily (banco > ambiente do sistema); em branco, a busca viva é desativada. */
    @Transactional(readOnly = true)
    fun resolveTavilyKey(): String = find()?.tavilyApiKey ?: envTavilyKey()

    /** Config efetiva de embeddings, ou null quando o publicador não configurou (memória desligada). */
    @Transactional(readOnly = true)
    fun resolveEmbedding(): ResolvedEmbedding? {
        val settings = find() ?: return null
        val provider = settings.embeddingProvider ?: return null
        val apiKey = settings.embeddingApiKey?.takeIf { it.isNotBlank() } ?: return null
        val baseUrl = settings.embeddingBaseUrl?.takeIf { it.isNotBlank() } ?: provider.defaultBaseUrl
        if (baseUrl.isBlank()) {
            return null
        }
        return ResolvedEmbedding(
            apiKey = apiKey,
            model = settings.embeddingModel?.takeIf { it.isNotBlank() } ?: provider.defaultModel,
            baseUrl = baseUrl,
        )
    }

    /**
     * Configuração efetiva de geração de imagem. Sem provedor/chave dedicados, lança erro amigável
     * (não há fallback de ambiente para imagem — é sempre trazida pelo publicador).
     */
    @Transactional(readOnly = true)
    fun resolveImage(): ResolvedImage {
        val settings = find()
        val provider =
            settings?.imageProvider
                ?: throw InvalidRequestException(
                    "Geração de imagem não configurada — escolha um provedor de imagem em Integrações",
                )
        val apiKey =
            settings.imageApiKey?.takeIf { it.isNotBlank() }
                ?: throw InvalidRequestException(
                    "Informe a chave do provedor de imagem em Integrações",
                )
        return ResolvedImage(
            provider = provider,
            apiKey = apiKey,
            model = settings.imageModel?.takeIf { it.isNotBlank() } ?: provider.defaultModel,
            baseUrl = settings.imageBaseUrl?.takeIf { it.isNotBlank() } ?: provider.defaultBaseUrl,
        )
    }

    /** Fallback de ambiente do Tavily: só para o tenant do sistema (Fase 2). */
    private fun envTavilyKey(): String =
        if (TenantContext.currentTenant() == TenantContext.DEFAULT_TENANT) searchProperties.tavily.apiKey else ""

    private fun find(): AiSettings? = repository.findByTenantId(TenantContext.currentTenant())

    /**
     * Fallback de chave por variável de ambiente: só Anthropic e SÓ para o tenant do sistema —
     * na Fase 2 cada publicador traz as próprias chaves.
     */
    private fun envKeyFor(provider: AiProvider): String =
        if (provider == AiProvider.ANTHROPIC && TenantContext.currentTenant() == TenantContext.DEFAULT_TENANT) {
            aiProperties.claude.apiKey
        } else {
            ""
        }

    private fun defaultModelFor(provider: AiProvider): String? =
        if (provider == AiProvider.ANTHROPIC) aiProperties.claude.model else provider.defaultModel

    private fun defaultBaseUrlFor(provider: AiProvider): String? =
        if (provider == AiProvider.ANTHROPIC) aiProperties.claude.baseUrl else provider.defaultBaseUrl

    private fun toResponse(settings: AiSettings?): AiSettingsResponse {
        val provider = settings?.provider ?: AiProvider.ANTHROPIC
        val customKey = !settings?.apiKey.isNullOrBlank()
        val tavilyCustom = !settings?.tavilyApiKey.isNullOrBlank()
        return AiSettingsResponse(
            provider = provider,
            keySource = source(customKey, envKeyFor(provider)),
            keyHint = settings?.apiKey?.let(::keyHint),
            model = settings?.model,
            baseUrl = settings?.baseUrl,
            defaultModel = defaultModelFor(provider).orEmpty(),
            defaultBaseUrl = defaultBaseUrlFor(provider),
            providers =
                AiProvider.entries.map {
                    AiProviderInfo(
                        id = it,
                        label = it.label,
                        defaultModel = defaultModelFor(it),
                        defaultBaseUrl = defaultBaseUrlFor(it),
                        requiresBaseUrl = it.requiresBaseUrl,
                    )
                },
            tavilySource = source(tavilyCustom, envTavilyKey()),
            tavilyKeyHint = settings?.tavilyApiKey?.let(::keyHint),
            imageProvider = settings?.imageProvider,
            imageKeyHint = settings?.imageApiKey?.let(::keyHint),
            imageModel = settings?.imageModel,
            imageBaseUrl = settings?.imageBaseUrl,
            imageProviders =
                ImageProvider.entries.map {
                    ImageProviderInfo(
                        id = it,
                        label = it.label,
                        defaultModel = it.defaultModel,
                        defaultBaseUrl = it.defaultBaseUrl,
                    )
                },
            embeddingProvider = settings?.embeddingProvider,
            embeddingKeyHint = settings?.embeddingApiKey?.let(::keyHint),
            embeddingModel = settings?.embeddingModel,
            embeddingBaseUrl = settings?.embeddingBaseUrl,
            embeddingProviders =
                EmbeddingProvider.entries.map {
                    EmbeddingProviderInfo(
                        id = it,
                        label = it.label,
                        defaultModel = it.defaultModel,
                        defaultBaseUrl = it.defaultBaseUrl,
                        requiresBaseUrl = it.requiresBaseUrl,
                    )
                },
        )
    }

    private fun source(
        custom: Boolean,
        envKey: String,
    ): AiKeySource? =
        when {
            custom -> AiKeySource.CUSTOM
            envKey.isNotBlank() -> AiKeySource.ENVIRONMENT
            else -> null
        }

    /** Sufixo de conferência da chave — nunca a chave inteira. */
    private fun keyHint(key: String): String = "••••${key.takeLast(4)}"
}
