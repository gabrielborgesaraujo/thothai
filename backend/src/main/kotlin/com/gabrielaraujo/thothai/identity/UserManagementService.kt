package com.gabrielaraujo.thothai.identity

import com.gabrielaraujo.thothai.shared.BusinessRuleException
import com.gabrielaraujo.thothai.shared.InvalidRequestException
import com.gabrielaraujo.thothai.shared.ResourceNotFoundException
import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * Cadastro e gestão de publicadores (Fase 2): auto-registro entra como PENDING até a aprovação;
 * o administrador do sistema cria contas já ativas, aprova e desativa. O tenant de um publicador
 * novo é o próprio handle (chave estável e legível de isolamento — RNF03).
 */
@Service
@Transactional
internal class UserManagementService(
    private val users: UserAccountRepository,
    private val passwordEncoder: PasswordEncoder,
) {
    /** Auto-registro público: nasce PENDING e só loga após aprovação. */
    fun register(request: RegisterRequest): UserAccount = create(request, UserStatus.PENDING)

    /** Criação pelo administrador do sistema: nasce ATIVO. */
    fun createByAdmin(request: RegisterRequest): UserAccount = create(request, UserStatus.ACTIVE)

    /**
     * Cria uma conta PENDENTE a partir de uma identidade do LinkedIn (login sem conta prévia):
     * username/handle derivados do nome (ou do e-mail), senha aleatória — o acesso é pelo LinkedIn
     * após a aprovação do administrador. O `sub` do LinkedIn já fica vinculado.
     */
    fun createFromLinkedIn(
        name: String?,
        email: String?,
        linkedinSub: String,
    ): UserAccount {
        val cleanedEmail = email?.trim()?.lowercase()?.takeIf { it.isNotBlank() }
        val base = slugify(name ?: cleanedEmail?.substringBefore('@') ?: "membro")
        val handle = uniqueHandle(base)
        return TenantContext.runAs(handle) {
            users.save(
                UserAccount(
                    username = uniqueUsername(base),
                    passwordHash = requireNotNull(passwordEncoder.encode(UUID.randomUUID().toString())),
                    handle = handle,
                    email = cleanedEmail,
                    role = UserRole.PUBLISHER,
                    status = UserStatus.PENDING,
                    linkedinSub = linkedinSub,
                ),
            )
        }
    }

    @Transactional(readOnly = true)
    fun list(): List<UserAccount> = users.findAllByOrderByCreatedAtDesc()

    /** Endereço público válido, não reservado e ainda livre? (checagem ao vivo no cadastro) */
    @Transactional(readOnly = true)
    fun isHandleAvailable(handle: String): Boolean {
        val cleaned = handle.trim().lowercase()
        return HANDLE.matches(cleaned) && cleaned !in RESERVED_HANDLES && !users.existsByHandle(cleaned)
    }

    fun updateStatus(
        id: UUID,
        status: UserStatus,
    ): UserAccount {
        val user = users.findById(id).orElseThrow { ResourceNotFoundException("Usuário não encontrado") }
        if (user.role == UserRole.SYSTEM_ADMIN && status != UserStatus.ACTIVE) {
            throw BusinessRuleException("O administrador do sistema não pode ser desativado")
        }
        user.status = status
        return user
    }

    private fun create(
        request: RegisterRequest,
        status: UserStatus,
    ): UserAccount {
        val username = request.username.trim().lowercase()
        val handle = request.handle.trim().lowercase()
        val email = request.email.trim().lowercase()
        if (!USERNAME.matches(username)) {
            throw InvalidRequestException("Usuário deve ter 3–30 caracteres: letras minúsculas, números e hífen")
        }
        if (!HANDLE.matches(handle)) {
            throw InvalidRequestException("Endereço deve ter 3–30 caracteres: letras minúsculas, números e hífen")
        }
        if (handle in RESERVED_HANDLES) {
            throw InvalidRequestException("Esse endereço é reservado — escolha outro")
        }
        if (users.existsByUsername(username)) {
            throw BusinessRuleException("Esse usuário já existe")
        }
        if (users.existsByHandle(handle)) {
            throw BusinessRuleException("Esse endereço já está em uso")
        }
        if (users.existsByEmail(email)) {
            throw BusinessRuleException("Esse e-mail já está cadastrado")
        }
        // O tenant do novo publicador é o handle; o registro nasce sob esse tenant (RNF03).
        return TenantContext.runAs(handle) {
            users.save(
                UserAccount(
                    username = username,
                    passwordHash = requireNotNull(passwordEncoder.encode(request.password)),
                    handle = handle,
                    email = email,
                    role = UserRole.PUBLISHER,
                    status = status,
                ),
            )
        }
    }

    /** Normaliza um texto livre para o formato de handle/username (minúsculas, sem acento, hífen). */
    private fun slugify(value: String): String {
        val slug =
            java.text.Normalizer
                .normalize(value, java.text.Normalizer.Form.NFD)
                .replace(Regex("\\p{M}+"), "")
                .lowercase()
                .replace(Regex("[^a-z0-9]+"), "-")
                .trim('-')
                .take(30)
        return slug.padEnd(3, 'x').takeIf { it.length >= 3 && it !in RESERVED_HANDLES } ?: "membro"
    }

    /** Handle único e válido a partir de uma base, sufixando -2, -3… em caso de colisão/reserva. */
    private fun uniqueHandle(base: String): String = unique(base) { !users.existsByHandle(it) && it !in RESERVED_HANDLES }

    private fun uniqueUsername(base: String): String = unique(base) { !users.existsByUsername(it) }

    private inline fun unique(
        base: String,
        available: (String) -> Boolean,
    ): String {
        if (available(base)) {
            return base
        }
        var suffix = 2
        while (!available("${base.take(27)}-$suffix")) {
            suffix++
        }
        return "${base.take(27)}-$suffix"
    }

    private companion object {
        val USERNAME = Regex("^[a-z0-9-]{3,30}$")
        val HANDLE = Regex("^[a-z0-9-]{3,30}$")

        /** Colidem com rotas do app/gateway ou são confusos como endereço público. */
        val RESERVED_HANDLES =
            setOf(
                "admin",
                "api",
                "posts",
                "p",
                "system",
                "login",
                "logout",
                "registro",
                "register",
                "assets",
                "media",
                "feed",
                "sitemap",
                "robots",
                "swagger-ui",
                "actuator",
                "default",
                "thothai",
                "www",
                "recuperar-senha",
                "redefinir-senha",
            )
    }
}
