package com.gabrielaraujo.thothai.identity

import com.gabrielaraujo.thothai.shared.InvalidRequestException
import com.gabrielaraujo.thothai.shared.ResourceNotFoundException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/** Gestão da conta do usuário logado (RF01): troca de senha com verificação da senha atual. */
@Service
@Transactional
internal class AccountService(
    private val users: UserAccountRepository,
    private val passwordEncoder: PasswordEncoder,
) {
    fun changePassword(
        username: String,
        currentPassword: String,
        newPassword: String,
    ) {
        val user =
            users.findByUsername(username)
                ?: throw ResourceNotFoundException("Usuário não encontrado")
        if (!passwordEncoder.matches(currentPassword, user.passwordHash)) {
            throw InvalidRequestException("Senha atual incorreta")
        }
        user.passwordHash = requireNotNull(passwordEncoder.encode(newPassword))
    }
}
