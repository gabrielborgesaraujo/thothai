package com.gabrielaraujo.thothai.identity

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.authentication.DisabledException
import org.springframework.security.authentication.LockedException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.context.SecurityContextRepository
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/**
 * Autenticação e auto-registro (RF01 / Fase 2). O login persiste o contexto de segurança na
 * sessão (cookie HttpOnly); o registro público nasce PENDING até a aprovação do administrador.
 */
@RestController
@RequestMapping("/api/auth")
internal class AuthController(
    private val authenticationManager: AuthenticationManager,
    private val securityContextRepository: SecurityContextRepository,
    private val loginAttempts: LoginAttemptService,
    private val userManagement: UserManagementService,
) {
    private val securityContextHolderStrategy = SecurityContextHolder.getContextHolderStrategy()

    @PostMapping("/login")
    fun login(
        @Valid @RequestBody body: LoginRequest,
        request: HttpServletRequest,
        response: HttpServletResponse,
    ): UserResponse {
        if (loginAttempts.isLocked(body.username)) {
            throw LockedException("Conta temporariamente bloqueada")
        }
        val authentication =
            try {
                authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(body.username, body.password),
                )
            } catch (ex: BadCredentialsException) {
                loginAttempts.recordFailure(body.username)
                throw ex
            }
        loginAttempts.reset(body.username)
        val context = securityContextHolderStrategy.createEmptyContext()
        context.authentication = authentication
        securityContextHolderStrategy.context = context
        securityContextRepository.saveContext(context, request, response)
        return (authentication.principal as AppUserDetails).toUserResponse()
    }

    /** Auto-registro público: entra na fila de aprovação do administrador do sistema. */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    fun register(
        @Valid @RequestBody request: RegisterRequest,
    ): SystemUserResponse = userManagement.register(request).toResponse()

    @GetMapping("/me")
    fun me(authentication: Authentication): UserResponse = (authentication.principal as AppUserDetails).toUserResponse()

    private fun AppUserDetails.toUserResponse() = UserResponse(username = username, role = role, handle = handle)

    @ExceptionHandler(BadCredentialsException::class)
    fun handleBadCredentials(ex: BadCredentialsException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "Usuário ou senha inválidos")

    /** Cadastro PENDING ou DISABLED: mensagem específica em vez de "senha inválida". */
    @ExceptionHandler(DisabledException::class)
    fun handleDisabled(ex: DisabledException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.FORBIDDEN,
            "Cadastro aguardando aprovação ou desativado — fale com o administrador.",
        )

    @ExceptionHandler(LockedException::class)
    fun handleLocked(ex: LockedException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.TOO_MANY_REQUESTS,
            "Muitas tentativas de login. Tente novamente em alguns minutos.",
        )
}
