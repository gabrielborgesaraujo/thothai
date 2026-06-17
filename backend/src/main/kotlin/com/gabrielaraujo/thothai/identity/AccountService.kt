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
    @Transactional(readOnly = true)
    fun info(username: String): AccountInfoResponse = find(username).toInfo()

    /** Atualiza o e-mail de cadastro (único entre as contas). */
    fun updateEmail(
        username: String,
        email: String,
    ): AccountInfoResponse {
        val user = find(username)
        val normalized = email.trim().lowercase()
        if (normalized != user.email && users.existsByEmail(normalized)) {
            throw InvalidRequestException("Esse e-mail já está cadastrado em outra conta")
        }
        user.email = normalized
        return user.toInfo()
    }

    private fun find(username: String): UserAccount =
        users.findByUsername(username) ?: throw ResourceNotFoundException("Usuário não encontrado")

    private fun UserAccount.toInfo() =
        AccountInfoResponse(
            username = username,
            handle = handle,
            role = role,
            email = email,
            linkedinLinked = linkedinSub != null,
        )

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
