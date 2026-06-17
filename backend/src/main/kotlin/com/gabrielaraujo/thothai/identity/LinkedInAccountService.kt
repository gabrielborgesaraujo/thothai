package com.gabrielaraujo.thothai.identity

import com.gabrielaraujo.thothai.shared.BusinessRuleException
import com.gabrielaraujo.thothai.shared.InvalidRequestException
import com.gabrielaraujo.thothai.shared.ResourceNotFoundException
import com.gabrielaraujo.thothai.social.LinkedInProfile
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Duration
import java.time.Instant

/**
 * Login e vínculo de conta com o LinkedIn (identidade OIDC):
 * - login: `sub` já vinculado → entra; e-mail bate com conta existente → envia confirmação de
 *   vínculo; sem conta → cria PENDENTE a partir do LinkedIn (fila de aprovação);
 * - vínculo (a partir do painel ou do login com e-mail batendo): sempre validado por um link com
 *   token enviado ao e-mail de cadastro (uso único, 30 minutos), confirmando a posse da conta.
 */
@Service
@Transactional
internal class LinkedInAccountService(
    private val users: UserAccountRepository,
    private val tokens: LinkedInLinkTokenRepository,
    private val userManagement: UserManagementService,
    private val mail: MailService,
    @param:org.springframework.beans.factory.annotation.Value("\${thothai.public-origin}")
    private val publicOrigin: String,
) {
    private val random = SecureRandom()

    /** Resultado do login com LinkedIn — o controller traduz em redirecionamento. */
    sealed interface LoginOutcome {
        /** Conta vinculada e ATIVA: o controller estabelece a sessão. */
        data class Authenticated(
            val user: UserAccount,
        ) : LoginOutcome

        /** Conta vinculada porém aguardando aprovação. */
        data object Pending : LoginOutcome

        /** Conta vinculada porém desativada. */
        data object Disabled : LoginOutcome

        /** E-mail bateu com conta existente: enviamos o e-mail de confirmação do vínculo. */
        data object LinkVerificationSent : LoginOutcome

        /** Sem conta: criamos uma PENDENTE a partir do LinkedIn (aguarda aprovação). */
        data object AccountCreatedPending : LoginOutcome
    }

    fun loginWithLinkedIn(profile: LinkedInProfile): LoginOutcome {
        users.findByLinkedinSub(profile.sub)?.let { user ->
            return when (user.status) {
                UserStatus.ACTIVE -> LoginOutcome.Authenticated(user)
                UserStatus.PENDING -> LoginOutcome.Pending
                UserStatus.DISABLED -> LoginOutcome.Disabled
            }
        }
        val email =
            profile.email
                ?.trim()
                ?.lowercase()
                ?.takeIf { it.isNotBlank() }
        val existing = email?.let { users.findByEmail(it) }
        if (existing != null) {
            sendLinkToken(existing, profile)
            return LoginOutcome.LinkVerificationSent
        }
        userManagement.createFromLinkedIn(profile.name, email, profile.sub)
        return LoginOutcome.AccountCreatedPending
    }

    /** Vínculo iniciado pelo usuário logado (painel): envia o e-mail de confirmação. */
    fun requestLink(
        username: String,
        profile: LinkedInProfile,
    ) {
        val user = users.findByUsername(username) ?: throw ResourceNotFoundException("Usuário não encontrado")
        if (user.email.isNullOrBlank()) {
            throw InvalidRequestException("Configure um e-mail na conta antes de vincular o LinkedIn")
        }
        ensureNotLinkedElsewhere(profile.sub, user)
        sendLinkToken(user, profile)
    }

    /** Confirma o vínculo com o token recebido por e-mail (uso único, validade de 30 minutos). */
    fun confirmLink(token: String): UserAccount {
        val record =
            tokens.findByTokenHash(sha256(token.trim()))?.takeIf {
                it.usedAt == null && it.expiresAt.isAfter(Instant.now())
            } ?: throw InvalidRequestException("Link inválido ou expirado — refaça o vínculo")
        val user =
            users.findById(record.userId).orElseThrow {
                InvalidRequestException("Link inválido ou expirado — refaça o vínculo")
            }
        ensureNotLinkedElsewhere(record.linkedinSub, user)
        user.linkedinSub = record.linkedinSub
        record.usedAt = Instant.now()
        return user
    }

    /** Desfaz o vínculo da conta logada. */
    fun unlink(username: String) {
        val user = users.findByUsername(username) ?: throw ResourceNotFoundException("Usuário não encontrado")
        user.linkedinSub = null
    }

    private fun ensureNotLinkedElsewhere(
        sub: String,
        user: UserAccount,
    ) {
        val owner = users.findByLinkedinSub(sub)
        if (owner != null && owner.id != user.id) {
            throw BusinessRuleException("Essa conta do LinkedIn já está vinculada a outro usuário")
        }
    }

    private fun sendLinkToken(
        user: UserAccount,
        profile: LinkedInProfile,
    ) {
        val token = generateToken()
        tokens.save(
            LinkedInLinkToken(
                userId = requireNotNull(user.id),
                linkedinSub = profile.sub,
                linkedinName = profile.name,
                tokenHash = sha256(token),
                expiresAt = Instant.now().plus(VALIDITY),
            ),
        )
        val link = "${publicOrigin.trimEnd('/')}/vincular-linkedin?token=$token"
        mail.send(
            to = requireNotNull(user.email),
            subject = "ThothAI — confirmação de vínculo com o LinkedIn",
            text =
                "Olá, ${user.username}!\n\n" +
                    "Recebemos um pedido para vincular sua conta ao LinkedIn" +
                    (profile.name?.let { " ($it)" } ?: "") +
                    ". Confirme pelo link abaixo (válido por 30 minutos):\n\n$link\n\n" +
                    "Depois de confirmar, você poderá entrar com o LinkedIn. " +
                    "Se não foi você, ignore este e-mail — nada será vinculado.",
        )
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
