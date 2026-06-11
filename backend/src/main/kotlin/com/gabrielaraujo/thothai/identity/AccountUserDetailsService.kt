package com.gabrielaraujo.thothai.identity

import org.springframework.security.core.userdetails.UserDetails
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.core.userdetails.UsernameNotFoundException
import org.springframework.stereotype.Service

/**
 * Carrega o usuário pelo username (globalmente único) para a autenticação. Cadastros PENDING e
 * DISABLED entram como `enabled = false` — o login falha com DisabledException e o controller
 * traduz para a mensagem adequada.
 */
@Service
internal class AccountUserDetailsService(
    private val repository: UserAccountRepository,
) : UserDetailsService {
    override fun loadUserByUsername(username: String): UserDetails {
        val user =
            repository.findByUsername(username)
                ?: throw UsernameNotFoundException("Usuário não encontrado")
        return AppUserDetails(
            username = user.username,
            passwordHash = user.passwordHash,
            tenantId = user.tenantId,
            handle = user.handle,
            role = user.role,
            enabled = user.status == UserStatus.ACTIVE,
        )
    }
}
