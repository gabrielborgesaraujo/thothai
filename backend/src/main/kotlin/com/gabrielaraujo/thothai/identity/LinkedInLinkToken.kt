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
 * Token de confirmação do vínculo de uma conta com uma identidade do LinkedIn: uso único,
 * validade de 30 minutos. Como no reset de senha, só o hash SHA-256 é persistido — o token em
 * claro viaja apenas no e-mail. Carrega o `sub` do LinkedIn a ser vinculado ao confirmar.
 */
@Entity
@Table(name = "linkedin_link_tokens")
@EntityListeners(AuditingEntityListener::class)
class LinkedInLinkToken(
    @Column(name = "user_id", nullable = false)
    var userId: UUID,
    @Column(name = "linkedin_sub", nullable = false, length = 64)
    var linkedinSub: String,
    @Column(name = "linkedin_name", length = 255)
    var linkedinName: String? = null,
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
