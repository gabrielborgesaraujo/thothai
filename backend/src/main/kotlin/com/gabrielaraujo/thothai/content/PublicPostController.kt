package com.gabrielaraujo.thothai.content

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * Leitura pública de postagens publicadas (RF06). Rotas GET liberadas no SecurityConfig
 * (prefixo /api/posts).
 */
@RestController
@RequestMapping("/api/posts")
internal class PublicPostController(
    private val postService: PostService,
) {
    @GetMapping
    fun list(): List<PostSummaryResponse> = postService.listPublished().map { it.toSummary() }

    @GetMapping("/{slug}")
    fun get(
        @PathVariable slug: String,
    ): PublicPostResponse = postService.getPublishedBySlug(slug).toPublic()
}
