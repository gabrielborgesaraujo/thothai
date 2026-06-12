package com.gabrielaraujo.thothai.identity

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/**
 * Conta do usuário logado (RF01): dados de cadastro (e-mail) e troca de senha.
 * Protegido por papel no SecurityConfig (prefixo /api/admin).
 */
@RestController
@RequestMapping("/api/admin/account")
internal class AccountController(
    private val accountService: AccountService,
) {
    @GetMapping
    fun info(authentication: Authentication): AccountInfoResponse = accountService.info(authentication.name)

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
