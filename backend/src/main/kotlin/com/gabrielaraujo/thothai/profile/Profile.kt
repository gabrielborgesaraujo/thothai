package com.gabrielaraujo.thothai.profile

import com.gabrielaraujo.thothai.shared.AbstractTenantEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table

/**
 * Cartão de identidade do publicador (RF07). Há um único registro por tenant
 * (restrição UNIQUE em `tenant_id`).
 */
@Entity
@Table(name = "profiles")
class Profile(
    @Column(name = "display_name", nullable = false)
    var displayName: String,
    @Column(name = "headline")
    var headline: String?,
    @Column(name = "bio")
    var bio: String?,
    @Column(name = "photo_url")
    var photoUrl: String?,
    @Column(name = "linkedin_url")
    var linkedinUrl: String?,
    @Column(name = "email")
    var email: String?,
) : AbstractTenantEntity()
