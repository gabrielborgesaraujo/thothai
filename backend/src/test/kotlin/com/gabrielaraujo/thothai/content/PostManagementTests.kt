package com.gabrielaraujo.thothai.content

import com.gabrielaraujo.thothai.TestcontainersConfiguration
import com.gabrielaraujo.thothai.shared.ResourceNotFoundException
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.data.domain.PageRequest
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertNull

/**
 * Testes de integração (serviço → repositório, via Testcontainers) das regras do gerenciador de
 * postagens (RF02) e da leitura pública (RF06).
 */
@Import(TestcontainersConfiguration::class)
@SpringBootTest
class PostManagementTests {
    @Autowired
    private lateinit var postService: PostService

    @Autowired
    private lateinit var posts: PostRepository

    @BeforeEach
    fun cleanUp() {
        posts.deleteAll()
    }

    @Test
    fun `cria rascunho sem publishedAt e publica definindo publishedAt`() {
        val draft = postService.create(request(title = "Meu Primeiro Artigo", status = PostStatus.DRAFT))
        assertEquals("meu-primeiro-artigo", draft.slug)
        assertEquals(PostStatus.DRAFT, draft.status)
        assertNull(draft.publishedAt)

        val published =
            postService.update(
                requireNotNull(draft.id),
                request(title = "Meu Primeiro Artigo", status = PostStatus.PUBLISHED),
            )
        assertEquals(PostStatus.PUBLISHED, published.status)
        assertNotNull(published.publishedAt)
        assertEquals("meu-primeiro-artigo", published.slug)
    }

    @Test
    fun `gera slug unico no tenant em caso de colisao`() {
        val first = postService.create(request(title = "Titulo Repetido"))
        val second = postService.create(request(title = "Titulo Repetido"))
        assertEquals("titulo-repetido", first.slug)
        assertEquals("titulo-repetido-2", second.slug)
    }

    @Test
    fun `listagem publica retorna apenas publicados`() {
        postService.create(request(title = "Rascunho", status = PostStatus.DRAFT))
        postService.create(request(title = "Publicado", status = PostStatus.PUBLISHED))

        val published = postService.listPublished(PageRequest.of(0, 10))
        assertEquals(1, published.totalElements)
        assertEquals("publicado", published.content.first().slug)
    }

    @Test
    fun `pagina a listagem admin`() {
        repeat(3) { postService.create(request(title = "Post $it")) }

        val firstPage = postService.list(PageRequest.of(0, 2))
        assertEquals(3, firstPage.totalElements)
        assertEquals(2, firstPage.totalPages)
        assertEquals(2, firstPage.content.size)

        val secondPage = postService.list(PageRequest.of(1, 2))
        assertEquals(1, secondPage.content.size)
    }

    @Test
    fun `contadores do dashboard`() {
        postService.create(request(title = "A", status = PostStatus.DRAFT))
        postService.create(request(title = "B", status = PostStatus.PUBLISHED))
        postService.create(request(title = "C", status = PostStatus.PUBLISHED))

        val stats = postService.stats()
        assertEquals(1, stats.draft)
        assertEquals(2, stats.published)
        assertEquals(3, stats.total)
    }

    @Test
    fun `leitura de slug inexistente lanca ResourceNotFoundException`() {
        assertFailsWith<ResourceNotFoundException> {
            postService.getPublishedBySlug("inexistente")
        }
    }

    private fun request(
        title: String,
        status: PostStatus = PostStatus.DRAFT,
        type: PostType = PostType.ARTICLE,
        summary: String? = "resumo",
        body: String = "conteúdo em **markdown**",
    ) = PostRequest(
        title = title,
        type = type,
        status = status,
        summary = summary,
        body = body,
    )
}
