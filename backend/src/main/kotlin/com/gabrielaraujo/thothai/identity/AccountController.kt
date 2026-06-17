package com.gabrielaraujo.thothai.identity

import com.gabrielaraujo.thothai.social.LinkedInOidcGateway
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/**
 * Conta do usuário logado (RF01): dados de cadastro (e-mail), troca de senha e vínculo com o
 * LinkedIn. Protegido por papel no SecurityConfig (prefixo /api/admin).
 */
@RestController
@RequestMapping("/api/admin/account")
internal class AccountController(
    private val accountService: AccountService,
    private val linkedIn: LinkedInAccountService,
    private val oidc: LinkedInOidcGateway,
    @param:Value("\${thothai.public-origin}") private val publicOrigin: String,
) {
    @GetMapping
    fun info(authentication: Authentication): AccountInfoResponse = accountService.info(authentication.name)

    /** Inicia o vínculo com o LinkedIn (OAuth): retorna a URL e marca o fluxo como "vínculo". */
    @GetMapping("/linkedin/authorize-url")
    fun linkedInAuthorizeUrl(response: HttpServletResponse): Map<String, String> {
        val state = newOauthState()
        setLinkedInOauthCookies(response, state, LINKEDIN_FLOW_LINK)
        return mapOf("url" to oidc.authorizeUrl(linkedInRedirectUri(publicOrigin), state))
    }

    /** Desfaz o vínculo com o LinkedIn. */
    @DeleteMapping("/linkedin")
    fun unlinkLinkedIn(authentication: Authentication): AccountInfoResponse {
        linkedIn.unlink(authentication.name)
        return accountService.info(authentication.name)
    }

    /** Atualiza os dados da conta (e-mail de cadastro). */
    @PutMapping
    fun update(
        authentication: Authentication,
        @Valid @RequestBody request: AccountUpdateRequest,
    ): AccountInfoResponse = accountService.updateEmail(authentication.name, request.email)

    @PostMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun changePassword(
        authentication: Authentication,
        @Valid @RequestBody request: ChangePasswordRequest,
    ) = accountService.changePassword(authentication.name, request.currentPassword, request.newPassword)
}
