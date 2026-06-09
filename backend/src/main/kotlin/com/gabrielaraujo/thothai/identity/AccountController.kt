package com.gabrielaraujo.thothai.identity

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/**
 * Conta do admin (RF01). Protegido por ROLE_ADMIN no SecurityConfig (prefixo /api/admin).
 */
@RestController
@RequestMapping("/api/admin/account")
internal class AccountController(
    private val accountService: AccountService,
) {
    @PostMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun changePassword(
        authentication: Authentication,
        @Valid @RequestBody request: ChangePasswordRequest,
    ) = accountService.changePassword(authentication.name, request.currentPassword, request.newPassword)
}
