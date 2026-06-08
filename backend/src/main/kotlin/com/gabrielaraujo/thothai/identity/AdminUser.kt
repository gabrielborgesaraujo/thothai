package com.gabrielaraujo.thothai.identity

import com.gabrielaraujo.thothai.shared.AbstractTenantEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table

/**
 * Administrador do painel (RF01). No MVP single-publisher existe um único registro por tenant,
 * criado pelo [AdminSeeder] a partir da configuração.
 */
@Entity
@Table(name = "admin_users")
class AdminUser(
    @Column(name = "username", nullable = false)
    var username: String,
    @Column(name = "password_hash", nullable = false)
    var passwordHash: String,
) : AbstractTenantEntity()
