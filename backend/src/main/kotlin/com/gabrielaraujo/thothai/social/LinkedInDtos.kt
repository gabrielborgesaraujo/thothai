package com.gabrielaraujo.thothai.social

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.Instant

/** Credenciais do app LinkedIn criado pelo usuário no portal de desenvolvedores. */
data class LinkedInCredentialsRequest(
    @field:NotBlank
    @field:Size(max = 255)
    val clientId: String,
    @field:NotBlank
    @field:Size(max = 255)
    val clientSecret: String,
)

/** Publicação no feed do membro conectado. */
data class LinkedInShareRequest(
    @field:NotBlank
    @field:Size(max = 2900)
    val text: String,
    /** URL do artigo no portal (vira o cartão do post); opcional. */
    @field:Size(max = 1024)
    val url: String? = null,
)

data class LinkedInShareResponse(
    val postId: String,
)

/** Estado da conexão — segredos aparecem apenas como sufixo de conferência. */
data class LinkedInStatusResponse(
    val configured: Boolean,
    val connected: Boolean,
    val memberName: String?,
    val tokenExpiresAt: Instant?,
    val clientIdHint: String?,
)
