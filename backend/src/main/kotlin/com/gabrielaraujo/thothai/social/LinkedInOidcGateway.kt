package com.gabrielaraujo.thothai.social

import com.gabrielaraujo.thothai.shared.InvalidRequestException
import org.springframework.stereotype.Service
import org.springframework.web.util.UriComponentsBuilder

/** Perfil OpenID Connect do LinkedIn usado para login/vínculo de conta (módulo identity). */
data class LinkedInProfile(
    val sub: String,
    val name: String?,
    val email: String?,
    val emailVerified: Boolean,
)

/**
 * API pública do módulo social para o fluxo de **login/vínculo com LinkedIn** (consumida pelo
 * módulo identity). Reusa as credenciais do app da plataforma ([LinkedInAppSettings]) e o cliente
 * HTTP do LinkedIn, mas é um fluxo OAuth próprio: não autenticado, com escopo de e-mail e redirect
 * dedicado. O `state` anti-CSRF é gerido por quem chama (cookie), pois não há sessão ainda.
 */
@Service
class LinkedInOidcGateway internal constructor(
    private val appSettings: LinkedInAppSettingsRepository,
    private val api: LinkedInApi,
) {
    /** O administrador do sistema já configurou as credenciais do app da plataforma? */
    fun isConfigured(): Boolean =
        appSettings.findFirstByOrderByCreatedAtAsc()?.let {
            !it.clientId.isNullOrBlank() && !it.clientSecret.isNullOrBlank()
        } ?: false

    /** URL de autorização OAuth (escopo openid/profile/email) com o redirect e o state informados. */
    fun authorizeUrl(
        redirectUri: String,
        state: String,
    ): String {
        val app = requireConfiguredApp()
        return UriComponentsBuilder
            .fromUriString("https://www.linkedin.com/oauth/v2/authorization")
            .queryParam("response_type", "code")
            .queryParam("client_id", app.clientId)
            .queryParam("redirect_uri", redirectUri)
            .queryParam("state", state)
            .queryParam("scope", "openid profile email")
            .build()
            .encode()
            .toUriString()
    }

    /** Troca o código pelo token e devolve o perfil OIDC (sub, nome, e-mail, e-mail verificado). */
    fun fetchProfile(
        code: String,
        redirectUri: String,
    ): LinkedInProfile {
        val app = requireConfiguredApp()
        val token =
            api.exchangeCode(
                clientId = requireNotNull(app.clientId),
                clientSecret = requireNotNull(app.clientSecret),
                code = code,
                redirectUri = redirectUri,
            )
        val member = api.fetchMember(token.accessToken)
        return LinkedInProfile(
            sub = member.id,
            name = member.name,
            email = member.email,
            emailVerified = member.emailVerified,
        )
    }

    private fun requireConfiguredApp(): LinkedInAppSettings =
        appSettings
            .findFirstByOrderByCreatedAtAsc()
            ?.takeIf { !it.clientId.isNullOrBlank() && !it.clientSecret.isNullOrBlank() }
            ?: throw InvalidRequestException(
                "Integração LinkedIn não configurada pelo administrador do sistema",
            )
}
