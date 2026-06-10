package com.gabrielaraujo.thothai.assistant

import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * Gestão das chaves de IA configuradas pelo usuário (painel) e resolução efetiva para as
 * integrações: a chave do banco tem precedência; em branco, cai nas variáveis de ambiente.
 * As chaves nunca saem inteiras pela API — apenas um sufixo de conferência ([keyHint]).
 */
@Service
@Transactional
internal class AiSettingsService(
    private val repository: AiSettingsRepository,
    private val aiProperties: AiProperties,
    private val searchProperties: SearchProperties,
) {
    @Transactional(readOnly = true)
    fun get(): AiSettingsResponse = toResponse(find())

    /**
     * Atualização parcial: campo `null` mantém o valor atual; string em branco limpa
     * (volta ao fallback de ambiente).
     */
    fun update(request: AiSettingsRequest): AiSettingsResponse {
        val settings = find() ?: AiSettings()
        request.anthropicApiKey?.let { settings.anthropicApiKey = it.trim().ifBlank { null } }
        request.anthropicModel?.let { settings.anthropicModel = it.trim().ifBlank { null } }
        request.tavilyApiKey?.let { settings.tavilyApiKey = it.trim().ifBlank { null } }
        return toResponse(repository.save(settings))
    }

    /** Chave + modelo efetivos do Claude (banco > ambiente). */
    @Transactional(readOnly = true)
    fun resolveClaude(): ResolvedClaude {
        val settings = find()
        return ResolvedClaude(
            apiKey = settings?.anthropicApiKey ?: aiProperties.claude.apiKey,
            model = settings?.anthropicModel ?: aiProperties.claude.model,
        )
    }

    /** Chave efetiva do Tavily (banco > ambiente); em branco, a busca viva fica desativada. */
    @Transactional(readOnly = true)
    fun resolveTavilyKey(): String = find()?.tavilyApiKey ?: searchProperties.tavily.apiKey

    private fun find(): AiSettings? = repository.findByTenantId(TenantContext.currentTenant())

    private fun toResponse(settings: AiSettings?): AiSettingsResponse {
        val anthropicCustom = !settings?.anthropicApiKey.isNullOrBlank()
        val tavilyCustom = !settings?.tavilyApiKey.isNullOrBlank()
        return AiSettingsResponse(
            anthropicSource = source(anthropicCustom, aiProperties.claude.apiKey),
            anthropicKeyHint = settings?.anthropicApiKey?.let(::keyHint),
            anthropicModel = settings?.anthropicModel,
            defaultModel = aiProperties.claude.model,
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

    internal data class ResolvedClaude(
        val apiKey: String,
        val model: String,
    )
}
