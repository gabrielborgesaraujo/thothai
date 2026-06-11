package com.gabrielaraujo.thothai.identity

import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.User

/**
 * Principal autenticado com os dados de tenancy embutidos: o [TenantContextFilter] lê daqui o
 * tenant da requisição sem ir ao banco a cada chamada.
 */
class AppUserDetails(
    username: String,
    passwordHash: String,
    val tenantId: String,
    val handle: String,
    val role: UserRole,
    enabled: Boolean,
) : User(
        username,
        passwordHash,
        enabled,
        true,
        true,
        true,
        listOf(SimpleGrantedAuthority("ROLE_${role.name}")),
    )
