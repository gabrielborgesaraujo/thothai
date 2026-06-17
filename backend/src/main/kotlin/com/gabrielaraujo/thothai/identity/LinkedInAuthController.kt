package com.gabrielaraujo.thothai.identity

import com.gabrielaraujo.thothai.social.LinkedInOidcGateway
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.context.SecurityContextRepository
import org.springframework.web.bind.annotation.CookieValue
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/** Confirmação do vínculo da conta com o LinkedIn (token recebido por e-mail). */
data class LinkedInLinkConfirmRequest(
    @field:NotBlank val token: String,
)

/**
 * Login e vínculo com o LinkedIn (fluxo OAuth não autenticado, app da plataforma). O `state`
 * anti-CSRF viaja em cookie; o callback estabelece a sessão quando a conta está vinculada e ativa.
 */
@RestController
@RequestMapping("/api/auth/linkedin")
internal class LinkedInAuthController(
    private val oidc: LinkedInOidcGateway,
    private val accounts: LinkedInAccountService,
    private val securityContextRepository: SecurityContextRepository,
    @param:Value("\${thothai.public-origin}") private val publicOrigin: String,
) {
    private val securityContextHolderStrategy = SecurityContextHolder.getContextHolderStrategy()

    @GetMapping("/authorize-url")
    fun authorizeUrl(response: HttpServletResponse): Map<String, String> {
        val state = newOauthState()
        setLinkedInOauthCookies(response, state, LINKEDIN_FLOW_LOGIN)
        return mapOf("url" to oidc.authorizeUrl(linkedInRedirectUri(publicOrigin), state))
    }

    @GetMapping("/callback")
    fun callback(
        @RequestParam(required = false) code: String?,
        @RequestParam(required = false) state: String?,
        @RequestParam(required = false) error: String?,
        @CookieValue(name = LINKEDIN_STATE_COOKIE, required = false) stateCookie: String?,
        @CookieValue(name = LINKEDIN_FLOW_COOKIE, required = false) flowCookie: String?,
        authentication: Authentication?,
        request: HttpServletRequest,
        response: HttpServletResponse,
    ): ResponseEntity<Void> {
        clearLinkedInOauthCookies(response)
        if (error != null || code.isNullOrBlank() || state.isNullOrBlank() || state != stateCookie) {
            return redirect("/admin/login?linkedin=error")
        }
        val profile =
            runCatching { oidc.fetchProfile(code, linkedInRedirectUri(publicOrigin)) }
                .getOrElse { return redirect("/admin/login?linkedin=error") }

        // Vínculo a partir do painel (usuário logado): envia o e-mail de confirmação.
        val principal = authentication?.principal as? AppUserDetails
        if (flowCookie == LINKEDIN_FLOW_LINK && principal != null) {
            return runCatching { accounts.requestLink(principal.username, profile) }
                .fold(
                    onSuccess = { redirect("/admin/account?linkedin=verify") },
                    onFailure = { redirect("/admin/account?linkedin=error") },
                )
        }

        return when (val outcome = accounts.loginWithLinkedIn(profile)) {
            is LinkedInAccountService.LoginOutcome.Authenticated -> {
                establishSession(outcome.user, request, response)
                redirect("/admin?linkedin=ok")
            }

            LinkedInAccountService.LoginOutcome.Pending,
            LinkedInAccountService.LoginOutcome.AccountCreatedPending,
            -> {
                redirect("/admin/login?linkedin=pending")
            }

            LinkedInAccountService.LoginOutcome.Disabled -> {
                redirect("/admin/login?linkedin=disabled")
            }

            LinkedInAccountService.LoginOutcome.LinkVerificationSent -> {
                redirect("/admin/login?linkedin=verify")
            }
        }
    }

    @PostMapping("/link/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun confirmLink(
        @Valid @RequestBody request: LinkedInLinkConfirmRequest,
    ) {
        accounts.confirmLink(request.token)
    }

    /** Cria a sessão autenticada para a conta resolvida (login sem senha — o LinkedIn provou a identidade). */
    private fun establishSession(
        user: UserAccount,
        request: HttpServletRequest,
        response: HttpServletResponse,
    ) {
        val principal =
            AppUserDetails(
                username = user.username,
                passwordHash = user.passwordHash,
                tenantId = user.tenantId,
                handle = user.handle,
                role = user.role,
                enabled = true,
            )
        val authentication = UsernamePasswordAuthenticationToken(principal, principal.password, principal.authorities)
        val context = securityContextHolderStrategy.createEmptyContext()
        context.authentication = authentication
        securityContextHolderStrategy.context = context
        securityContextRepository.saveContext(context, request, response)
    }

    private fun redirect(location: String): ResponseEntity<Void> =
        ResponseEntity.status(HttpStatus.FOUND).header(HttpHeaders.LOCATION, location).build()
}
