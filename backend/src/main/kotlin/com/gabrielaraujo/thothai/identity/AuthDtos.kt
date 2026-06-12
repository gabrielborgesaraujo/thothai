package com.gabrielaraujo.thothai.identity

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.Instant
import java.util.UUID

data class LoginRequest(
    @field:NotBlank val username: String,
    @field:NotBlank val password: String,
)

/** Sessão corrente: o frontend usa papel e handle para montar navegação e links públicos. */
data class UserResponse(
    val username: String,
    val role: UserRole,
    val handle: String,
)

data class ChangePasswordRequest(
    @field:NotBlank val currentPassword: String,
    @field:NotBlank @field:Size(min = 8) val newPassword: String,
)

/** Auto-registro público e criação pelo admin do sistema. */
data class RegisterRequest(
    @field:NotBlank @field:Size(max = 30) val username: String,
    @field:NotBlank @field:Size(min = 8) val password: String,
    /** Endereço público (/handle) e chave de tenant do publicador. */
    @field:NotBlank @field:Size(max = 30) val handle: String,
    /** E-mail de cadastro (destino do link de redefinição de senha). */
    @field:NotBlank @field:Email @field:Size(max = 255) val email: String,
)

/** Pedido de redefinição de senha (usuário ou e-mail) — resposta sempre silenciosa. */
data class PasswordResetRequest(
    @field:NotBlank @field:Size(max = 255) val identifier: String,
)

/** Confirmação da redefinição com o token recebido por e-mail. */
data class PasswordResetConfirmRequest(
    @field:NotBlank val token: String,
    @field:NotBlank @field:Size(min = 8) val newPassword: String,
)

/** Dados da conta do usuário logado. */
data class AccountInfoResponse(
    val username: String,
    val handle: String,
    val role: UserRole,
    val email: String?,
)

/** Atualização dos dados da conta. */
data class AccountUpdateRequest(
    @field:NotBlank @field:Email @field:Size(max = 255) val email: String,
)

data class UserStatusRequest(
    val status: UserStatus,
)

/** Usuário na gestão do sistema. */
data class SystemUserResponse(
    val id: UUID,
    val username: String,
    val handle: String,
    val email: String?,
    val role: UserRole,
    val status: UserStatus,
    val createdAt: Instant?,
)

internal fun UserAccount.toResponse() =
    SystemUserResponse(
        id = requireNotNull(id),
        username = username,
        handle = handle,
        email = email,
        role = role,
        status = status,
        createdAt = createdAt,
    )
