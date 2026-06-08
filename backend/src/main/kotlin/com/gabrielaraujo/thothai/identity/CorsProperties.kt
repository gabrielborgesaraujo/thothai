package com.gabrielaraujo.thothai.identity

import org.springframework.boot.context.properties.ConfigurationProperties

/** Origens autorizadas a consumir a API com credenciais (painel admin). */
@ConfigurationProperties(prefix = "thothai.cors")
data class CorsProperties(
    val allowedOrigins: String,
)
