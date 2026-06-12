package com.gabrielaraujo.thothai.identity

import com.gabrielaraujo.thothai.shared.InvalidRequestException
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Duration
import java.time.Instant

/**
 * Redefinição de senha por e-mail: o link com token (uso único, 30 minutos) vai para o e-mail
 * de cadastro. A requisição é sempre silenciosa (não revela se a conta existe).
 */
@Service
@Transactional
internal class PasswordResetService(
    private val users: UserAccountRepository,
    private val tokens: PasswordResetTokenRepository,
    private val mail: MailService,
    private val passwordEncoder: PasswordEncoder,
    @param:Value("\${thothai.public-origin}") private val publicOrigin: String,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val random = SecureRandom()

    /** Gera o token e envia o link; silencioso para contas inexistentes ou sem e-mail. */
    fun request(identifier: String) {
        val cleaned = identifier.trim().lowercase()
        val user = users.findByUsername(cleaned) ?: users.findByEmail(cleaned)
        val email = user?.email
        if (user == null || email.isNullOrBlank() || user.status == UserStatus.DISABLED) {
            log.info("Pedido de redefinição ignorado para identificador desconhecido/sem e-mail")
            return
        }
        val token = generateToken()
        tokens.save(
            PasswordResetToken(
                userId = requireNotNull(user.id),
                tokenHash = sha256(token),
                expiresAt = Instant.now().plus(VALIDITY),
            ),
        )
        val link = "${publicOrigin.trimEnd('/')}/redefinir-senha?token=$token"
        mail.send(
            to = email,
            subject = "ThothAI — redefinição de senha",
            text =
                "Olá, ${user.username}!\n\n" +
                    "Recebemos um pedido para redefinir a senha da sua conta. " +
                    "Use o link abaixo (válido por 30 minutos):\n\n$link\n\n" +
                    "Se não foi você, ignore este e-mail — sua senha continua a mesma.",
        )
    }

    /** Valida o token (hash, validade, uso único) e define a nova senha. */
    fun confirm(
        token: String,
        newPassword: String,
    ) {
        val record =
            tokens.findByTokenHash(sha256(token.trim()))?.takeIf {
                it.usedAt == null && it.expiresAt.isAfter(Instant.now())
            } ?: throw InvalidRequestException("Link inválido ou expirado — peça uma nova redefinição")
        val user =
            users.findById(record.userId).orElseThrow {
                InvalidRequestException("Link inválido ou expirado — peça uma nova redefinição")
            }
        user.passwordHash = requireNotNull(passwordEncoder.encode(newPassword))
        record.usedAt = Instant.now()
    }

    private fun generateToken(): String {
        val bytes = ByteArray(32)
        random.nextBytes(bytes)
        return bytes.joinToString("") { "%02x".format(it) }
    }

    private fun sha256(value: String): String =
        MessageDigest
            .getInstance("SHA-256")
            .digest(value.toByteArray())
            .joinToString("") { "%02x".format(it) }

    private companion object {
        val VALIDITY: Duration = Duration.ofMinutes(30)
    }
}
