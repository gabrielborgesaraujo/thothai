package com.gabrielaraujo.thothai.identity

import com.gabrielaraujo.thothai.TestcontainersConfiguration
import com.gabrielaraujo.thothai.shared.InvalidRequestException
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.security.crypto.password.PasswordEncoder
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

/** Testes de integração da troca de senha do admin (RF01). */
@Import(TestcontainersConfiguration::class)
@SpringBootTest
class AccountServiceTest {
    @Autowired
    private lateinit var accountService: AccountService

    @Autowired
    private lateinit var adminUsers: AdminUserRepository

    @Autowired
    private lateinit var passwordEncoder: PasswordEncoder

    @BeforeEach
    fun setup() {
        adminUsers.deleteAll()
        adminUsers.save(
            AdminUser(username = "admin", passwordHash = requireNotNull(passwordEncoder.encode("original123"))),
        )
    }

    @Test
    fun `troca a senha quando a atual confere`() {
        accountService.changePassword("admin", "original123", "newpassword123")

        val admin = requireNotNull(adminUsers.findByTenantIdAndUsername("default", "admin"))
        assertTrue(passwordEncoder.matches("newpassword123", admin.passwordHash))
    }

    @Test
    fun `senha atual incorreta e rejeitada`() {
        assertFailsWith<InvalidRequestException> {
            accountService.changePassword("admin", "errada", "newpassword123")
        }
    }
}
