package com.gabrielaraujo.thothai.assistant

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

/** Configuração da assistência de IA (RF04/RF05), prefixo `thothai.ai`. */
@ConfigurationProperties(prefix = "thothai.ai")
data class AiProperties(
    val provider: String,
    val timeout: Duration,
    val claude: Claude,
) {
    data class Claude(
        val apiKey: String,
        val model: String,
        val baseUrl: String,
    )
}
