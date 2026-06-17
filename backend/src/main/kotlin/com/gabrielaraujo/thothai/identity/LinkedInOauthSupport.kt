package com.gabrielaraujo.thothai.identity

import jakarta.servlet.http.HttpServletResponse
import java.security.SecureRandom

/**
 * Apoio ao fluxo OAuth de login/vínculo com LinkedIn. O `state` anti-CSRF e o "modo" (login ou
 * vínculo autenticado) viajam em cookies HttpOnly de vida curta — não há sessão no início do
 * fluxo de login. SameSite=Lax garante o reenvio no retorno (navegação top-level vinda do LinkedIn).
 */
internal const val LINKEDIN_STATE_COOKIE = "li_state"
internal const val LINKEDIN_FLOW_COOKIE = "li_flow"
internal const val LINKEDIN_FLOW_LOGIN = "login"
internal const val LINKEDIN_FLOW_LINK = "link"
internal const val LINKEDIN_CALLBACK_PATH = "/api/auth/linkedin/callback"

private val stateRandom = SecureRandom()

internal fun linkedInRedirectUri(publicOrigin: String): String = "${publicOrigin.trimEnd('/')}$LINKEDIN_CALLBACK_PATH"

internal fun newOauthState(): String {
    val bytes = ByteArray(24)
    stateRandom.nextBytes(bytes)
    return bytes.joinToString("") { "%02x".format(it) }
}

internal fun setLinkedInOauthCookies(
    response: HttpServletResponse,
    state: String,
    flow: String,
) {
    response.addHeader("Set-Cookie", "$LINKEDIN_STATE_COOKIE=$state; Path=/; Max-Age=600; HttpOnly; SameSite=Lax")
    response.addHeader("Set-Cookie", "$LINKEDIN_FLOW_COOKIE=$flow; Path=/; Max-Age=600; HttpOnly; SameSite=Lax")
}

internal fun clearLinkedInOauthCookies(response: HttpServletResponse) {
    response.addHeader("Set-Cookie", "$LINKEDIN_STATE_COOKIE=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax")
    response.addHeader("Set-Cookie", "$LINKEDIN_FLOW_COOKIE=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax")
}
