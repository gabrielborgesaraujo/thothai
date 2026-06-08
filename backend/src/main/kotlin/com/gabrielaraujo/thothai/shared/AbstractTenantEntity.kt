package com.gabrielaraujo.thothai.shared

import jakarta.persistence.Column
import jakarta.persistence.EntityListeners
import jakarta.persistence.GeneratedValue
import jakarta.persistence.Id
import jakarta.persistence.MappedSuperclass
import org.springframework.data.annotation.CreatedDate
import org.springframework.data.annotation.LastModifiedDate
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import java.time.Instant
import java.util.UUID

/**
 * Superclasse para todas as entidades persistidas. Fornece:
 * - identidade ([id]) via UUID;
 * - chave de isolamento de inquilino ([tenantId]) — RNF03;
 * - auditoria de timestamps ([createdAt]/[updatedAt]).
 *
 * O [tenantId] é preenchido a partir do [TenantContext] na criação e é imutável.
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener::class)
abstract class AbstractTenantEntity {
    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    var id: UUID? = null
        protected set

    @Column(name = "tenant_id", nullable = false, updatable = false)
    var tenantId: String = TenantContext.currentTenant()
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
