package com.gabrielaraujo.thothai.identity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EntityListeners
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.springframework.data.annotation.CreatedDate
import org.springframework.data.annotation.LastModifiedDate
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import java.time.Instant
import java.util.UUID

/**
 * Token de redefinição de senha: uso único, validade de 30 minutos. O token em claro só viaja
 * no e-mail — aqui fica apenas o hash SHA-256. Entidade de autenticação (sem chave de tenant).
 */
@Entity
@Table(name = "password_reset_tokens")
@EntityListeners(AuditingEntityListener::class)
class PasswordResetToken(
    @Column(name = "user_id", nullable = false)
    var userId: UUID,
    @Column(name = "token_hash", nullable = false, length = 64)
    var tokenHash: String,
    @Column(name = "expires_at", nullable = false)
    var expiresAt: Instant,
    @Column(name = "used_at")
    var usedAt: Instant? = null,
) {
    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    var id: UUID? = null
        protected set

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant? = null
        protected set

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant? = null
        protected set
}
