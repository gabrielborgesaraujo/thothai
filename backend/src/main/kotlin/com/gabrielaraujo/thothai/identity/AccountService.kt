package com.gabrielaraujo.thothai.identity

import com.gabrielaraujo.thothai.shared.InvalidRequestException
import com.gabrielaraujo.thothai.shared.ResourceNotFoundException
import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/** Gestão da conta do admin (RF01): troca de senha com verificação da senha atual. */
@Service
@Transactional
internal class AccountService(
    private val adminUsers: AdminUserRepository,
    private val passwordEncoder: PasswordEncoder,
) {
    fun changePassword(
        username: String,
        currentPassword: String,
        newPassword: String,
    ) {
        val admin =
            adminUsers.findByTenantIdAndUsername(TenantContext.currentTenant(), username)
                ?: throw ResourceNotFoundException("Administrador não encontrado")
        if (!passwordEncoder.matches(currentPassword, admin.passwordHash)) {
            throw InvalidRequestException("Senha atual incorreta")
        }
        admin.passwordHash = requireNotNull(passwordEncoder.encode(newPassword))
    }
}
