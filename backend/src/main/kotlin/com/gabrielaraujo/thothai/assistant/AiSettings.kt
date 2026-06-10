package com.gabrielaraujo.thothai.assistant

import com.gabrielaraujo.thothai.shared.AbstractTenantEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table

/**
 * Chaves de IA configuradas pelo usuário no painel. Quando presentes, têm precedência sobre as
 * variáveis de ambiente (`thothai.ai`/`thothai.search`); em branco, a aplicação cai no fallback.
 */
@Entity
@Table(name = "ai_settings")
class AiSettings(
    @Column(name = "anthropic_api_key", length = 255)
    var anthropicApiKey: String? = null,
    @Column(name = "anthropic_model", length = 128)
    var anthropicModel: String? = null,
    @Column(name = "tavily_api_key", length = 255)
    var tavilyApiKey: String? = null,
) : AbstractTenantEntity()
