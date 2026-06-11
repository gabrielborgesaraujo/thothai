package com.gabrielaraujo.thothai.social

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
 * Integração MACRO da plataforma (linha única): credenciais do app LinkedIn, geridas apenas pelo
 * administrador do sistema. Cada publicador conecta a própria conta usando este app.
 * Configuração de plataforma — sem chave de tenant de propósito.
 */
@Entity
@Table(name = "linkedin_app_settings")
@EntityListeners(AuditingEntityListener::class)
class LinkedInAppSettings(
    @Column(name = "client_id", length = 255)
    var clientId: String? = null,
    @Column(name = "client_secret", length = 255)
    var clientSecret: String? = null,
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
