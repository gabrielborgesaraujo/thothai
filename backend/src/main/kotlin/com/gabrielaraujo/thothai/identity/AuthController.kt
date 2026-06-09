package com.gabrielaraujo.thothai.identity

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.BadCredentialsException
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
import org.springframework.web.bind.annotation.RestController

/**
 * Endpoints de autenticação do admin (RF01). O login persiste o contexto de segurança na sessão,
 * fazendo o servlet emitir o cookie de sessão HttpOnly. O logout é tratado pelo Spring Security.
 */
@RestController
@RequestMapping("/api/auth")
internal class AuthController(
    private val authenticationManager: AuthenticationManager,
    private val securityContextRepository: SecurityContextRepository,
    private val loginAttempts: LoginAttemptService,
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
        return UserResponse(authentication.name)
    }

    @GetMapping("/me")
    fun me(authentication: Authentication): UserResponse = UserResponse(authentication.name)

    @ExceptionHandler(BadCredentialsException::class)
    fun handleBadCredentials(ex: BadCredentialsException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "Usuário ou senha inválidos")

    @ExceptionHandler(LockedException::class)
    fun handleLocked(ex: LockedException): ProblemDetail =
        ProblemDetail.forStatusAndDetail(
            HttpStatus.TOO_MANY_REQUESTS,
            "Muitas tentativas de login. Tente novamente em alguns minutos.",
        )
}
