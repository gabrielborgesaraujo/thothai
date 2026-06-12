package com.gabrielaraujo.thothai.identity

import com.gabrielaraujo.thothai.TestcontainersConfiguration
import com.gabrielaraujo.thothai.shared.BusinessRuleException
import com.gabrielaraujo.thothai.shared.InvalidRequestException
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.security.crypto.password.PasswordEncoder
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

/** Testes de contas (Fase 2): troca de senha, auto-registro com aprovação e isolamento. */
@Import(TestcontainersConfiguration::class)
@SpringBootTest
class AccountServiceTest {
    @Autowired
    private lateinit var accountService: AccountService

    @Autowired
    private lateinit var userManagement: UserManagementService

    @Autowired
    private lateinit var users: UserAccountRepository

    @Autowired
    private lateinit var passwordReset: PasswordResetService

    @Autowired
    private lateinit var resetTokens: PasswordResetTokenRepository

    @Autowired
    private lateinit var passwordEncoder: PasswordEncoder

    @BeforeEach
    fun cleanUp() {
        resetTokens.deleteAll()
        users.deleteAll()
    }

    private fun register(
        username: String,
        handle: String = username,
        email: String = "$username@exemplo.com",
        password: String = "senha-segura",
    ) = RegisterRequest(username = username, password = password, handle = handle, email = email)

    @Test
    fun `troca de senha exige a senha atual correta`() {
        userManagement.createByAdmin(register("maria", password = "senha-original"))

        assertFailsWith<InvalidRequestException> {
            accountService.changePassword("maria", "senha-errada", "senha-nova-123")
        }

        accountService.changePassword("maria", "senha-original", "senha-nova-123")
        val updated = users.findByUsername("maria")!!
        assertTrue(passwordEncoder.matches("senha-nova-123", updated.passwordHash))
    }

    @Test
    fun `auto-registro nasce pendente e a aprovacao ativa`() {
        val registered = userManagement.register(register("joao"))
        assertEquals(UserStatus.PENDING, registered.status)
        assertEquals(UserRole.PUBLISHER, registered.role)
        // O tenant do publicador é o próprio handle (isolamento RNF03).
        assertEquals("joao", registered.tenantId)

        val approved = userManagement.updateStatus(requireNotNull(registered.id), UserStatus.ACTIVE)
        assertEquals(UserStatus.ACTIVE, approved.status)
    }

    @Test
    fun `reset de senha gera token de 30 minutos, de uso unico`() {
        userManagement.createByAdmin(register("pedro", password = "senha-antiga"))
        passwordReset.request("pedro@exemplo.com")

        val record = resetTokens.findAll().single()
        assertTrue(
            record.expiresAt.isAfter(
                java.time.Instant
                    .now()
                    .plusSeconds(25 * 60),
            ),
        )
        // O token em claro não é persistido — para o teste, troca-se o hash por um conhecido.
        record.tokenHash =
            java.security.MessageDigest
                .getInstance("SHA-256")
                .digest("token-teste".toByteArray())
                .joinToString("") { "%02x".format(it) }
        resetTokens.save(record)

        assertFailsWith<InvalidRequestException> { passwordReset.confirm("token-errado", "senha-nova-123") }
        passwordReset.confirm("token-teste", "senha-nova-123")
        assertTrue(passwordEncoder.matches("senha-nova-123", users.findByUsername("pedro")!!.passwordHash))
        // Uso único: o mesmo token não vale duas vezes.
        assertFailsWith<InvalidRequestException> { passwordReset.confirm("token-teste", "outra-senha-456") }
    }

    @Test
    fun `atualizacao de email valida unicidade`() {
        userManagement.createByAdmin(register("ana"))
        userManagement.createByAdmin(register("bia"))

        val updated = accountService.updateEmail("ana", "novo@exemplo.com")
        assertEquals("novo@exemplo.com", updated.email)
        assertFailsWith<InvalidRequestException> { accountService.updateEmail("ana", "bia@exemplo.com") }
    }

    @Test
    fun `handles reservados, duplicados e invalidos sao rejeitados`() {
        assertFailsWith<InvalidRequestException> {
            userManagement.register(register("alguem", handle = "admin"))
        }
        assertFailsWith<InvalidRequestException> {
            userManagement.register(register("alguem", handle = "Maiúsculo!"))
        }
        userManagement.register(register("fulano"))
        assertFailsWith<BusinessRuleException> {
            userManagement.register(register("outro", handle = "fulano"))
        }
        assertFailsWith<BusinessRuleException> {
            userManagement.register(register("fulano", handle = "outro-handle", email = "outro@exemplo.com"))
        }
    }
}
