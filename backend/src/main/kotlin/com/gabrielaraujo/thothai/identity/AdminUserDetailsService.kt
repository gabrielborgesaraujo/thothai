package com.gabrielaraujo.thothai.identity

import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.userdetails.User
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service

/** Carrega o administrador do tenant corrente para a autenticação do Spring Security. */
@Service
internal class AdminUserDetailsService(
    private val repository: AdminUserRepository,
) : UserDetailsService {
    override fun loadUserByUsername(username: String): UserDetails {
        val admin =
            repository.findByTenantIdAndUsername(TenantContext.currentTenant(), username)
                ?: throw UsernameNotFoundException("Usuário não encontrado")
        return User
            .withUsername(admin.username)
            .password(admin.passwordHash)
            .authorities(SimpleGrantedAuthority("ROLE_ADMIN"))
            .build()
    }
}
