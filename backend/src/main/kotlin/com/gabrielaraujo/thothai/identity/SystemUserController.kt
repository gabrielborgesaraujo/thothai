package com.gabrielaraujo.thothai.identity

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/**
 * Gestão de publicadores pelo administrador do sistema (Fase 2). Protegido por
 * ROLE_SYSTEM_ADMIN no SecurityConfig (prefixo /api/system).
 */
@RestController
@RequestMapping("/api/system/users")
internal class SystemUserController(
    private val userManagement: UserManagementService,
) {
    @GetMapping
    fun list(): List<SystemUserResponse> = userManagement.list().map { it.toResponse() }

    /** Conta criada pelo admin já nasce ativa. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @Valid @RequestBody request: RegisterRequest,
    ): SystemUserResponse = userManagement.createByAdmin(request).toResponse()

    /** Aprova (ACTIVE) ou desativa (DISABLED) um cadastro. */
    @PatchMapping("/{id}")
    fun updateStatus(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UserStatusRequest,
    ): SystemUserResponse = userManagement.updateStatus(id, request.status).toResponse()
}
