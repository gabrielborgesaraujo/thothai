package com.gabrielaraujo.thothai.content

import org.springframework.beans.factory.annotation.Value
import org.springframework.data.domain.PageRequest
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

/**
 * Descoberta e sindicação do portal público (SEO): RSS 2.0, sitemap e robots.txt.
 * Servidos pelo backend e roteados pelo gateway nginx na raiz do site.
 */
@RestController
internal class PublicFeedController(
    private val postService: PostService,
    @param:Value("\${thothai.public-origin}") private val publicOrigin: String,
) {
    private val origin = publicOrigin.trimEnd('/')

    @GetMapping("/feed.xml", produces = ["application/rss+xml;charset=UTF-8"])
    fun feed(): String {
        val posts = postService.listPublished(PageRequest.of(0, FEED_SIZE)).content
        val items =
            posts.joinToString("\n") { post ->
                val link = "$origin/posts/${post.slug}"
                val pubDate =
                    post.publishedAt?.let { RSS_DATE.format(it.atZone(ZoneOffset.UTC)) }.orEmpty()
                """
                |    <item>
                |      <title>${xml(post.title)}</title>
                |      <link>$link</link>
                |      <guid isPermaLink="true">$link</guid>
                |      <pubDate>$pubDate</pubDate>
                |      <description>${xml(post.summary.orEmpty())}</description>
                |    </item>
                """.trimMargin()
            }
        return """
            |<?xml version="1.0" encoding="UTF-8"?>
            |<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
            |  <channel>
            |    <title>ThothAI</title>
            |    <link>$origin</link>
            |    <description>Artigos, tutoriais e notas técnicas</description>
            |    <language>pt-BR</language>
            |    <atom:link href="$origin/feed.xml" rel="self" type="application/rss+xml"/>
            |$items
            |  </channel>
            |</rss>
            """.trimMargin()
    }

    @GetMapping("/sitemap.xml", produces = [MediaType.APPLICATION_XML_VALUE])
    fun sitemap(): String {
        val posts = postService.listPublished(PageRequest.of(0, SITEMAP_SIZE)).content
        val staticUrls =
            listOf("$origin/", "$origin/posts").joinToString("\n") { "  <url><loc>$it</loc></url>" }
        val postUrls =
            posts.joinToString("\n") { post ->
                val lastmod =
                    post.publishedAt?.let { "<lastmod>${SITEMAP_DATE.format(it.atZone(ZoneOffset.UTC))}</lastmod>" }.orEmpty()
                "  <url><loc>$origin/posts/${xml(post.slug)}</loc>$lastmod</url>"
            }
        return """
            |<?xml version="1.0" encoding="UTF-8"?>
            |<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            |$staticUrls
            |$postUrls
            |</urlset>
            """.trimMargin()
    }

    @GetMapping("/robots.txt", produces = [MediaType.TEXT_PLAIN_VALUE])
    fun robots(): String =
        """
        |User-agent: *
        |Allow: /
        |Disallow: /admin
        |Sitemap: $origin/sitemap.xml
        """.trimMargin()

    private fun xml(value: String): String =
        value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")

    private companion object {
        const val FEED_SIZE = 20
        const val SITEMAP_SIZE = 1000
        val RSS_DATE: DateTimeFormatter = DateTimeFormatter.RFC_1123_DATE_TIME
        val SITEMAP_DATE: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE
    }
}
