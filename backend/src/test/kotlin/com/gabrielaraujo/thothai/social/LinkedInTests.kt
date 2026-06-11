package com.gabrielaraujo.thothai.social

import com.gabrielaraujo.thothai.TestcontainersConfiguration
import com.gabrielaraujo.thothai.shared.InvalidRequestException
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.Primary
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Testes da conexão/publicação LinkedIn com a API externa substituída por um fake. */
@Import(TestcontainersConfiguration::class, LinkedInTests.FakeApiConfig::class)
@SpringBootTest
class LinkedInTests {
    @Autowired
    private lateinit var service: LinkedInService

    @Autowired
    private lateinit var repository: LinkedInConnectionRepository

    @Autowired
    private lateinit var api: LinkedInApi

    @BeforeEach
    fun cleanUp() {
        repository.deleteAll()
        (api as FakeLinkedInApi).shared.clear()
    }

    @Test
    fun `fluxo completo - credenciais, autorizacao, callback e publicacao`() {
        assertFalse(service.status().configured)
        // Sem credenciais não há URL de autorização.
        assertFailsWith<InvalidRequestException> { service.authorizeUrl() }

        val configured = service.saveCredentials(LinkedInCredentialsRequest("client-abcd", "segredo"))
        assertTrue(configured.configured)
        assertFalse(configured.connected)
        assertEquals("••••abcd", configured.clientIdHint)

        val url = service.authorizeUrl()
        assertTrue(url.startsWith("https://www.linkedin.com/oauth/v2/authorization"))
        assertTrue(url.contains("client_id=client-abcd"))
        assertTrue(url.contains("w_member_social"))
        val state = Regex("state=([a-f0-9]+)").find(url)!!.groupValues[1]

        // State errado é rejeitado; o correto conecta.
        assertFailsWith<InvalidRequestException> { service.handleCallback("code-1", "state-falso") }
        service.handleCallback("code-1", state)

        val connected = service.status()
        assertTrue(connected.connected)
        assertEquals("Gabriel Araújo", connected.memberName)

        val share = service.share(LinkedInShareRequest(text = "Novo artigo!", url = "https://blog/x"))
        assertEquals("urn:li:share:123", share.postId)
        val recorded = (api as FakeLinkedInApi).shared.single()
        assertEquals("urn:li:person:member-1", recorded.first)
        assertEquals("Novo artigo!", recorded.second)
    }

    @Test
    fun `publicar sem conexao e rejeitado e desconectar preserva as credenciais`() {
        assertFailsWith<InvalidRequestException> {
            service.share(LinkedInShareRequest(text = "oi"))
        }

        service.saveCredentials(LinkedInCredentialsRequest("client-1234", "segredo"))
        val state = Regex("state=([a-f0-9]+)").find(service.authorizeUrl())!!.groupValues[1]
        service.handleCallback("code", state)
        assertTrue(service.status().connected)

        val after = service.disconnect()
        assertFalse(after.connected)
        assertTrue(after.configured)
        assertNull(after.memberName)
        assertFailsWith<InvalidRequestException> { service.share(LinkedInShareRequest(text = "oi")) }
    }

    @TestConfiguration
    internal class FakeApiConfig {
        @Bean
        @Primary
        internal fun fakeLinkedInApi(): LinkedInApi = FakeLinkedInApi()
    }
}

/** API fake: troca qualquer código por um token fixo e registra as publicações. */
internal class FakeLinkedInApi : LinkedInApi {
    val shared = mutableListOf<Pair<String, String>>()

    override fun exchangeCode(
        clientId: String,
        clientSecret: String,
        code: String,
        redirectUri: String,
    ) = LinkedInToken("token-teste", 3600)

    override fun fetchMember(accessToken: String) = LinkedInMember("member-1", "Gabriel Araújo")

    override fun share(
        accessToken: String,
        memberUrn: String,
        text: String,
        articleUrl: String?,
    ): String {
        shared.add(memberUrn to text)
        return "urn:li:share:123"
    }
}
