package com.gabrielaraujo.thothai.content

import com.gabrielaraujo.thothai.shared.PageResponse
import org.springframework.data.domain.PageRequest
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
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
    fun list(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
    ): PageResponse<PostSummaryResponse> = PageResponse.from(postService.listPublished(PageRequest.of(page, size))) { it.toSummary() }

    @GetMapping("/{slug}")
    fun get(
        @PathVariable slug: String,
    ): PublicPostResponse = postService.getPublishedBySlug(slug).toPublic()
}
