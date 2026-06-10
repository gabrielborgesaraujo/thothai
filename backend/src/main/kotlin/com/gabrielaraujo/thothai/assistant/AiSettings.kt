package com.gabrielaraujo.thothai.assistant

import com.gabrielaraujo.thothai.shared.AbstractTenantEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table

/**
 * Integrações de IA configuradas pelo usuário no painel. Quando presentes, têm precedência sobre
 * as variáveis de ambiente (fallback apenas para Anthropic/Tavily); em branco, cai no fallback.
 */
@Entity
@Table(name = "ai_settings")
class AiSettings(
    /** Provedor de LLM escolhido; nulo usa o padrão do servidor (Anthropic). */
    @Enumerated(EnumType.STRING)
    @Column(name = "provider", length = 32)
    var provider: AiProvider? = null,
    @Column(name = "api_key", length = 255)
    var apiKey: String? = null,
    @Column(name = "model", length = 128)
    var model: String? = null,
    /** Base URL da API; usada principalmente no modo OpenAI-compatível. */
    @Column(name = "base_url", length = 512)
    var baseUrl: String? = null,
    @Column(name = "tavily_api_key", length = 255)
    var tavilyApiKey: String? = null,
) : AbstractTenantEntity()
