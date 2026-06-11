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
    private lateinit var passwordEncoder: PasswordEncoder

    @BeforeEach
    fun cleanUp() {
        users.deleteAll()
    }

    @Test
    fun `troca de senha exige a senha atual correta`() {
        userManagement.createByAdmin(RegisterRequest(username = "maria", password = "senha-original", handle = "maria"))

        assertFailsWith<InvalidRequestException> {
            accountService.changePassword("maria", "senha-errada", "senha-nova-123")
        }

        accountService.changePassword("maria", "senha-original", "senha-nova-123")
        val updated = users.findByUsername("maria")!!
        assertTrue(passwordEncoder.matches("senha-nova-123", updated.passwordHash))
    }

    @Test
    fun `auto-registro nasce pendente e a aprovacao ativa`() {
        val registered = userManagement.register(RegisterRequest("joao", "senha-segura", "joao"))
        assertEquals(UserStatus.PENDING, registered.status)
        assertEquals(UserRole.PUBLISHER, registered.role)
        // O tenant do publicador é o próprio handle (isolamento RNF03).
        assertEquals("joao", registered.tenantId)

        val approved = userManagement.updateStatus(requireNotNull(registered.id), UserStatus.ACTIVE)
        assertEquals(UserStatus.ACTIVE, approved.status)
    }

    @Test
    fun `handles reservados, duplicados e invalidos sao rejeitados`() {
        assertFailsWith<InvalidRequestException> {
            userManagement.register(RegisterRequest("alguem", "senha-segura", "admin"))
        }
        assertFailsWith<InvalidRequestException> {
            userManagement.register(RegisterRequest("alguem", "senha-segura", "Maiúsculo!"))
        }
        userManagement.register(RegisterRequest("fulano", "senha-segura", "fulano"))
        assertFailsWith<BusinessRuleException> {
            userManagement.register(RegisterRequest("outro", "senha-segura", "fulano"))
        }
        assertFailsWith<BusinessRuleException> {
            userManagement.register(RegisterRequest("fulano", "senha-segura", "outro-handle"))
        }
    }
}
