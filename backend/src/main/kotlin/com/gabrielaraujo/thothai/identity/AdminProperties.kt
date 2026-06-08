package com.gabrielaraujo.thothai.identity

import org.springframework.boot.context.properties.ConfigurationProperties

/** Credenciais do administrador único, usadas pelo seed inicial (RF01). */
@ConfigurationProperties(prefix = "thothai.admin")
data class AdminProperties(
    val username: String,
    val password: String,
)
