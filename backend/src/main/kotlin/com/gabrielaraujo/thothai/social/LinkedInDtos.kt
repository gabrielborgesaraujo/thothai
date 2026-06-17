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
    @field:Size(max = 3000)
    val text: String,
    /** URL do artigo no portal (vira o cartão do post); opcional. */
    @field:Size(max = 1024)
    val url: String? = null,
    /** Postagem de origem — quando presente, ela é marcada como compartilhada (badge). */
    val postId: java.util.UUID? = null,
)

data class LinkedInShareResponse(
    val postId: String,
)

/** Estado da conexão do publicador (o app é da plataforma; `configured` reflete isso). */
data class LinkedInStatusResponse(
    val configured: Boolean,
    val connected: Boolean,
    val memberName: String?,
    val tokenExpiresAt: Instant?,
)

/** Estado da integração macro (app da plataforma) — visão do admin do sistema. */
data class LinkedInAppResponse(
    val configured: Boolean,
    val clientIdHint: String?,
)
