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
    /** Geração de imagem por IA — configuração dedicada, independente do provedor de texto. */
    @Enumerated(EnumType.STRING)
    @Column(name = "image_provider", length = 32)
    var imageProvider: ImageProvider? = null,
    @Column(name = "image_api_key", length = 255)
    var imageApiKey: String? = null,
    @Column(name = "image_model", length = 128)
    var imageModel: String? = null,
    @Column(name = "image_base_url", length = 512)
    var imageBaseUrl: String? = null,
    /** Embeddings da memória do autor (RAG) — config dedicada. */
    @Enumerated(EnumType.STRING)
    @Column(name = "embedding_provider", length = 32)
    var embeddingProvider: EmbeddingProvider? = null,
    @Column(name = "embedding_api_key", length = 255)
    var embeddingApiKey: String? = null,
    @Column(name = "embedding_model", length = 128)
    var embeddingModel: String? = null,
    @Column(name = "embedding_base_url", length = 512)
    var embeddingBaseUrl: String? = null,
) : AbstractTenantEntity()
