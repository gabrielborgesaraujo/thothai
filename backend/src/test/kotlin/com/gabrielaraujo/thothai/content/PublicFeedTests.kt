package com.gabrielaraujo.thothai.content

import com.gabrielaraujo.thothai.TestcontainersConfiguration
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import kotlin.test.assertContains
import kotlin.test.assertFalse

/** Testes da sindicação pública (RSS/sitemap/robots) gerada a partir dos posts publicados. */
@Import(TestcontainersConfiguration::class)
@SpringBootTest
class PublicFeedTests {
    @Autowired
    private lateinit var postService: PostService

    @Autowired
    private lateinit var posts: PostRepository

    @Autowired
    private lateinit var feedController: PublicFeedController

    @Autowired
    private lateinit var users: com.gabrielaraujo.thothai.identity.UserAccountRepository

    @BeforeEach
    fun cleanUp() {
        posts.deleteAll()
        // O feed/sitemap monta URLs por handle: garante um publicador ativo dono do tenant
        // 'default' (onde o postService de teste cria os posts), sem depender de outros testes.
        users.deleteAll()
        com.gabrielaraujo.thothai.shared.TenantContext.runAs("default") {
            users.save(
                com.gabrielaraujo.thothai.identity.UserAccount(
                    username = "feedpub",
                    passwordHash = "hash",
                    handle = "feedpub",
                ),
            )
        }
    }

    @Test
    fun `feed lista publicados com link por handle e ignora rascunhos`() {
        postService.create(post("Kotlin & Coroutines", PostStatus.PUBLISHED))
        postService.create(post("Rascunho secreto", PostStatus.DRAFT))

        val feed = feedController.feed()
        assertContains(feed, "<title>Kotlin &amp; Coroutines</title>")
        assertContains(feed, "/feedpub/posts/kotlin-coroutines</link>")
        assertFalse(feed.contains("Rascunho secreto"))
    }

    @Test
    fun `sitemap inclui home, paginas do publicador e slugs publicados`() {
        postService.create(post("Post Publicado", PostStatus.PUBLISHED))

        val sitemap = feedController.sitemap()
        assertContains(sitemap, "<loc>http://localhost:8088/</loc>")
        assertContains(sitemap, "<loc>http://localhost:8088/feedpub</loc>")
        assertContains(sitemap, "<loc>http://localhost:8088/feedpub/posts</loc>")
        assertContains(sitemap, "<loc>http://localhost:8088/feedpub/posts/post-publicado</loc>")
    }

    @Test
    fun `robots aponta para o sitemap e bloqueia o admin`() {
        val robots = feedController.robots()
        assertContains(robots, "Disallow: /admin")
        assertContains(robots, "Sitemap: http://localhost:8088/sitemap.xml")
    }

    private fun post(
        title: String,
        status: PostStatus,
    ) = PostRequest(
        title = title,
        type = PostType.ARTICLE,
        status = status,
        summary = "resumo",
        body = "corpo",
    )
}
