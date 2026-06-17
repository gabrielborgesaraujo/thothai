package com.gabrielaraujo.thothai.identity

import com.gabrielaraujo.thothai.shared.AbstractTenantEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table

/** Papel do usuário na plataforma. */
enum class UserRole {
    /** Administra a plataforma: usuários e integrações macro. Também publica (tenant próprio). */
    SYSTEM_ADMIN,

    /** Cliente publicador: gere apenas o próprio conteúdo e as próprias chaves. */
    PUBLISHER,
}

/** Situação do cadastro. */
enum class UserStatus {
    /** Auto-registro aguardando aprovação do administrador do sistema (não loga). */
    PENDING,
    ACTIVE,
    DISABLED,
}

/**
 * Usuário da plataforma (Fase 2 — multi-tenant). O `tenantId` herdado é a chave de isolamento de
 * todo o conteúdo do publicador; o [handle] é o endereço público (`/handle`) e coincide com o
 * tenant nos cadastros novos.
 */
@Entity
@Table(name = "users")
class UserAccount(
    @Column(name = "username", nullable = false)
    var username: String,
    @Column(name = "password_hash", nullable = false)
    var passwordHash: String,
    @Column(name = "handle", nullable = false, length = 64)
    var handle: String,
    /** E-mail de cadastro (destino do link de redefinição de senha). */
    @Column(name = "email", length = 255)
    var email: String? = null,
    /** Identidade do LinkedIn (sub do OIDC) vinculada à conta; habilita o login com LinkedIn. */
    @Column(name = "linkedin_sub", length = 64)
    var linkedinSub: String? = null,
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 32)
    var role: UserRole = UserRole.PUBLISHER,
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    var status: UserStatus = UserStatus.ACTIVE,
) : AbstractTenantEntity()
