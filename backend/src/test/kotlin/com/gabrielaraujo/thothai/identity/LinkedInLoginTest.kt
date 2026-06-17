package com.gabrielaraujo.thothai.identity

import com.gabrielaraujo.thothai.TestcontainersConfiguration
import com.gabrielaraujo.thothai.shared.InvalidRequestException
import com.gabrielaraujo.thothai.social.LinkedInProfile
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import java.security.MessageDigest
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Login e vínculo com LinkedIn (Fase 2): resolução de conta por sub/e-mail e confirmação por token. */
@Import(TestcontainersConfiguration::class)
@SpringBootTest
class LinkedInLoginTest {
    @Autowired private lateinit var linkedIn: LinkedInAccountService

    @Autowired private lateinit var userManagement: UserManagementService

    @Autowired private lateinit var users: UserAccountRepository

    @Autowired private lateinit var tokens: LinkedInLinkTokenRepository

    @BeforeEach
    fun cleanUp() {
        tokens.deleteAll()
        users.deleteAll()
    }

    private fun register(
        username: String,
        email: String = "$username@exemplo.com",
    ) = RegisterRequest(username = username, password = "senha-segura", handle = username, email = email)

    private fun profile(
        sub: String = "li-123",
        name: String? = "Fulano de Tal",
        email: String? = null,
    ) = LinkedInProfile(sub = sub, name = name, email = email, emailVerified = true)

    private fun sha256(value: String) =
        MessageDigest
            .getInstance("SHA-256")
            .digest(value.toByteArray())
            .joinToString("") { "%02x".format(it) }

    @Test
    fun `sub vinculado e ativo autentica`() {
        val user = userManagement.createByAdmin(register("ativo"))
        user.linkedinSub = "li-ativo"
        users.save(user)

        val outcome = linkedIn.loginWithLinkedIn(profile(sub = "li-ativo"))

        assertTrue(outcome is LinkedInAccountService.LoginOutcome.Authenticated)
        assertEquals("ativo", (outcome as LinkedInAccountService.LoginOutcome.Authenticated).user.username)
    }

    @Test
    fun `email que casa com conta dispara confirmacao de vinculo`() {
        userManagement.createByAdmin(register("maria", email = "maria@exemplo.com"))

        val outcome = linkedIn.loginWithLinkedIn(profile(sub = "li-maria", email = "maria@exemplo.com"))

        assertEquals(LinkedInAccountService.LoginOutcome.LinkVerificationSent, outcome)
        val token = tokens.findAll().single()
        assertEquals("li-maria", token.linkedinSub)
        // A conta ainda NÃO está vinculada antes da confirmação.
        assertNull(users.findByUsername("maria")!!.linkedinSub)

        // Confirma com um token conhecido (o claro não é persistido — troca-se o hash).
        token.tokenHash = sha256("token-ok")
        tokens.save(token)
        linkedIn.confirmLink("token-ok")
        assertEquals("li-maria", users.findByUsername("maria")!!.linkedinSub)
        // Uso único.
        assertFailsWith<InvalidRequestException> { linkedIn.confirmLink("token-ok") }
    }

    @Test
    fun `sem conta cria publicador pendente vinculado ao linkedin`() {
        val outcome = linkedIn.loginWithLinkedIn(profile(sub = "li-novo", name = "Nova Pessoa", email = "nova@exemplo.com"))

        assertEquals(LinkedInAccountService.LoginOutcome.AccountCreatedPending, outcome)
        val created = users.findByLinkedinSub("li-novo")
        assertNotNull(created)
        assertEquals(UserStatus.PENDING, created.status)
        assertEquals("nova@exemplo.com", created.email)
        assertTrue(created.handle.startsWith("nova-pessoa"))
    }

    @Test
    fun `token invalido e rejeitado`() {
        assertFailsWith<InvalidRequestException> { linkedIn.confirmLink("inexistente") }
    }
}
