package com.gabrielaraujo.thothai.assistant

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

/** Configuração da busca viva (RF04), prefixo `thothai.search`. */
@ConfigurationProperties(prefix = "thothai.search")
data class SearchProperties(
    val provider: String,
    val timeout: Duration,
    val tavily: Tavily,
) {
    data class Tavily(
        val apiKey: String,
        val baseUrl: String,
    )
}
