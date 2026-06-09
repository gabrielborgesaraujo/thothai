package com.gabrielaraujo.thothai.profile

import com.gabrielaraujo.thothai.TestcontainersConfiguration
import com.gabrielaraujo.thothai.shared.ResourceNotFoundException
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/**
 * Testes de integração (serviço → repositório) da identidade (RF07) e do portfólio (RF08).
 */
@Import(TestcontainersConfiguration::class)
@SpringBootTest
class ProfilePresenceTests {
    @Autowired
    private lateinit var profileService: ProfileService

    @Autowired
    private lateinit var portfolioService: PortfolioService

    @Autowired
    private lateinit var profiles: ProfileRepository

    @Autowired
    private lateinit var entries: PortfolioEntryRepository

    @BeforeEach
    fun cleanUp() {
        entries.deleteAll()
        profiles.deleteAll()
    }

    @Test
    fun `upsert garante um unico perfil por tenant`() {
        profileService.upsert(profileRequest(displayName = "Gabriel"))
        profileService.upsert(profileRequest(displayName = "Gabriel Araújo", headline = "Engenheiro"))

        assertEquals(1, profiles.count())
        val current = profileService.get()
        assertEquals("Gabriel Araújo", current.displayName)
        assertEquals("Engenheiro", current.headline)
    }

    @Test
    fun `get sem perfil configurado lanca 404`() {
        assertFailsWith<ResourceNotFoundException> { profileService.get() }
    }

    @Test
    fun `listagem publica do portfolio retorna apenas visiveis em ordem`() {
        portfolioService.create(
            entryRequest(title = "Cargo Antigo", category = PortfolioCategory.EXPERIENCE, order = 1),
        )
        portfolioService.create(
            entryRequest(
                title = "Rascunho Oculto",
                category = PortfolioCategory.EXPERIENCE,
                order = 0,
                visible = false,
            ),
        )
        portfolioService.create(
            entryRequest(title = "Graduação", category = PortfolioCategory.EDUCATION, order = 0),
        )

        val visible = portfolioService.listVisible()

        assertEquals(2, visible.size)
        assertEquals(setOf("Cargo Antigo", "Graduação"), visible.map { it.title }.toSet())
    }

    @Test
    fun `get de entrada inexistente lanca 404`() {
        assertFailsWith<ResourceNotFoundException> {
            portfolioService.get(java.util.UUID.randomUUID())
        }
    }

    private fun profileRequest(
        displayName: String,
        headline: String? = null,
    ) = ProfileRequest(
        displayName = displayName,
        headline = headline,
        bio = null,
        photoUrl = null,
        linkedinUrl = null,
        email = null,
    )

    private fun entryRequest(
        title: String,
        category: PortfolioCategory,
        order: Int = 0,
        visible: Boolean = true,
    ) = PortfolioEntryRequest(
        category = category,
        title = title,
        organization = null,
        description = null,
        startDate = null,
        endDate = null,
        visible = visible,
        displayOrder = order,
    )
}
