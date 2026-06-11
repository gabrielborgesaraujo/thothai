package com.gabrielaraujo.thothai.content

import com.gabrielaraujo.thothai.TestcontainersConfiguration
import com.gabrielaraujo.thothai.shared.InvalidRequestException
import com.gabrielaraujo.thothai.shared.ResourceNotFoundException
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.data.domain.PageRequest
import java.time.Instant
import java.time.temporal.ChronoUnit
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
        postService.create(
            request(title = "D", status = PostStatus.SCHEDULED, scheduledAt = Instant.now().plus(1, ChronoUnit.DAYS)),
        )

        val stats = postService.stats()
        assertEquals(1, stats.draft)
        assertEquals(1, stats.scheduled)
        assertEquals(2, stats.published)
        assertEquals(4, stats.total)
    }

    @Test
    fun `filtra a listagem admin por status, tipo e termo de busca`() {
        postService.create(request(title = "Kotlin Coroutines", status = PostStatus.PUBLISHED, type = PostType.ARTICLE))
        postService.create(request(title = "Spring Modulith na prática", status = PostStatus.DRAFT, type = PostType.TUTORIAL))
        postService.create(request(title = "Nota sobre Kotlin", status = PostStatus.DRAFT, type = PostType.NOTE))

        assertEquals(2, postService.list(PageRequest.of(0, 10), status = PostStatus.DRAFT).totalElements)
        assertEquals(1, postService.list(PageRequest.of(0, 10), type = PostType.TUTORIAL).totalElements)
        assertEquals(2, postService.list(PageRequest.of(0, 10), query = "kotlin").totalElements)
        assertEquals(
            1,
            postService.list(PageRequest.of(0, 10), status = PostStatus.PUBLISHED, query = "KOTLIN").totalElements,
        )
    }

    @Test
    fun `normaliza tags e filtra a listagem publica por tag e busca`() {
        postService.create(
            request(title = "Post de Kotlin", status = PostStatus.PUBLISHED, tags = listOf(" Kotlin ", "jvm", "kotlin")),
        )
        postService.create(request(title = "Post de Angular", status = PostStatus.PUBLISHED, tags = listOf("Angular")))
        postService.create(request(title = "Rascunho de Rust", status = PostStatus.DRAFT, tags = listOf("rust")))

        val kotlinPosts = postService.listPublished(PageRequest.of(0, 10), tag = "kotlin")
        assertEquals(1, kotlinPosts.totalElements)
        assertEquals(setOf("kotlin", "jvm"), kotlinPosts.content.first().tags)

        assertEquals(1, postService.listPublished(PageRequest.of(0, 10), query = "angular").totalElements)
        // Tags de rascunhos não vazam para o portal público.
        assertEquals(listOf("angular", "jvm", "kotlin"), postService.publishedTags())
    }

    @Test
    fun `agendamento exige horario e o job publica posts vencidos`() {
        assertFailsWith<InvalidRequestException> {
            postService.create(request(title = "Sem horário", status = PostStatus.SCHEDULED))
        }

        // Truncado a micros: o TIMESTAMPTZ do Postgres não preserva nanossegundos.
        val past = Instant.now().minus(1, ChronoUnit.HOURS).truncatedTo(ChronoUnit.MICROS)
        val future = Instant.now().plus(1, ChronoUnit.DAYS)
        val due = postService.create(request(title = "Vencido", status = PostStatus.SCHEDULED, scheduledAt = past))
        postService.create(request(title = "Futuro", status = PostStatus.SCHEDULED, scheduledAt = future))

        assertEquals(1, postService.publishDueScheduled())

        val published = postService.get(requireNotNull(due.id))
        assertEquals(PostStatus.PUBLISHED, published.status)
        assertEquals(past, published.publishedAt)
        assertNull(published.scheduledAt)
        // O segundo continua aguardando.
        assertEquals(1, postService.stats().scheduled)
    }

    @Test
    fun `banner e persistido e pode ser removido`() {
        val created =
            postService.create(
                PostRequest(
                    title = "Com banner",
                    type = PostType.ARTICLE,
                    status = PostStatus.DRAFT,
                    summary = null,
                    body = "corpo",
                    bannerUrl = "http://localhost:9000/thothai-media/banner.png",
                ),
            )
        assertEquals("http://localhost:9000/thothai-media/banner.png", created.bannerUrl)

        val updated =
            postService.update(
                requireNotNull(created.id),
                PostRequest(
                    title = "Com banner",
                    type = PostType.ARTICLE,
                    status = PostStatus.DRAFT,
                    summary = null,
                    body = "corpo",
                    bannerUrl = " ",
                ),
            )
        assertNull(updated.bannerUrl)
    }

    @Test
    fun `busca publica full-text encontra termo no corpo`() {
        postService.create(
            request(title = "Guia de concorrência", status = PostStatus.PUBLISHED, body = "Falando de corrotinas estruturadas."),
        )
        postService.create(request(title = "Outro assunto", status = PostStatus.PUBLISHED, body = "Nada a ver."))

        val found = postService.listPublished(PageRequest.of(0, 10), query = "corrotinas")
        assertEquals(1, found.totalElements)
        assertEquals("guia-de-concorrencia", found.content.first().slug)
    }

    @Test
    fun `detalhe publico traz anterior, proximo e relacionadas por tags`() {
        val first = postService.create(request(title = "Primeiro", status = PostStatus.PUBLISHED, tags = listOf("kotlin")))
        Thread.sleep(5)
        postService.create(request(title = "Segundo", status = PostStatus.PUBLISHED, tags = listOf("kotlin", "jvm")))
        Thread.sleep(5)
        postService.create(request(title = "Terceiro", status = PostStatus.PUBLISHED, tags = listOf("angular")))

        val detail = postService.publishedDetail("segundo")
        assertEquals("primeiro", detail.previous?.slug)
        assertEquals("terceiro", detail.next?.slug)
        // Relacionada por tag em comum (kotlin); o de angular fica de fora.
        assertEquals(listOf("primeiro"), detail.related.map { it.slug })

        val firstDetail = postService.publishedDetail(first.slug)
        assertNull(firstDetail.previous)
        assertEquals("segundo", firstDetail.next?.slug)
    }

    @Test
    fun `atualizacao guarda versao anterior e a restauracao e consultavel`() {
        val post = postService.create(request(title = "Versão 1", body = "corpo v1"))
        postService.update(requireNotNull(post.id), request(title = "Versão 2", body = "corpo v2"))
        postService.update(requireNotNull(post.id), request(title = "Versão 3", body = "corpo v3"))

        val revisions = postService.listRevisions(requireNotNull(post.id))
        assertEquals(2, revisions.size)
        assertEquals("Versão 2", revisions[0].title)
        assertEquals("Versão 1", revisions[1].title)

        val oldest = postService.getRevision(requireNotNull(post.id), requireNotNull(revisions[1].id))
        assertEquals("corpo v1", oldest.body)
    }

    @Test
    fun `marca compartilhamento no linkedin`() {
        val post = postService.create(request(title = "Compartilhado", status = PostStatus.PUBLISHED))
        postService.markLinkedInShared(requireNotNull(post.id), "urn:li:share:42")

        val reloaded = postService.get(requireNotNull(post.id))
        assertNotNull(reloaded.linkedinSharedAt)
        assertEquals("urn:li:share:42", reloaded.linkedinPostId)
    }

    @Test
    fun `voltar para rascunho limpa o agendamento`() {
        val post =
            postService.create(
                request(title = "Agendado", status = PostStatus.SCHEDULED, scheduledAt = Instant.now().plus(1, ChronoUnit.DAYS)),
            )

        val draft = postService.update(requireNotNull(post.id), request(title = "Agendado", status = PostStatus.DRAFT))
        assertEquals(PostStatus.DRAFT, draft.status)
        assertNull(draft.scheduledAt)
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
        tags: List<String> = emptyList(),
        scheduledAt: Instant? = null,
    ) = PostRequest(
        title = title,
        type = type,
        status = status,
        summary = summary,
        body = body,
        tags = tags,
        scheduledAt = scheduledAt,
    )
}
