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

    /** Chave efetiva do Tavily (banco > ambiente); em branco, a busca viva fica desativada. */
    @Transactional(readOnly = true)
    fun resolveTavilyKey(): String = find()?.tavilyApiKey ?: searchProperties.tavily.apiKey

    private fun find(): AiSettings? = repository.findByTenantId(TenantContext.currentTenant())

    /** Só a Anthropic tem fallback de chave por variável de ambiente. */
    private fun envKeyFor(provider: AiProvider): String = if (provider == AiProvider.ANTHROPIC) aiProperties.claude.apiKey else ""

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
            tavilySource = source(tavilyCustom, searchProperties.tavily.apiKey),
            tavilyKeyHint = settings?.tavilyApiKey?.let(::keyHint),
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
