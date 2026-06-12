package com.gabrielaraujo.thothai.content

import com.gabrielaraujo.thothai.profile.ProfileQueries
import com.gabrielaraujo.thothai.shared.PageResponse
import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.data.domain.PageRequest
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * Leitura pública das postagens de um publicador (RF06). O tenant é resolvido pelo handle do
 * caminho (TenantContextFilter); rotas GET liberadas no SecurityConfig (prefixo /api/p).
 */
@RestController
@RequestMapping("/api/p/{handle}/posts")
internal class PublicPostController(
    private val postService: PostService,
    private val profiles: ProfileQueries,
) {
    @GetMapping
    fun list(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
        @RequestParam(required = false) q: String?,
        @RequestParam(required = false) tag: String?,
    ): PageResponse<PostSummaryResponse> =
        PageResponse.from(postService.listPublished(PageRequest.of(page, size), q, tag)) { it.toSummary() }

    /** Tags em uso nos posts publicados — alimenta os chips de filtro do portal. */
    @GetMapping("/tags")
    fun tags(): List<String> = postService.publishedTags()

    @GetMapping("/{slug}")
    fun get(
        @PathVariable handle: String,
        @PathVariable slug: String,
    ): PublicPostResponse {
        // Autor: handle do caminho + nome do cartão de identidade (fallback no próprio handle).
        val author =
            PostAuthorResponse(
                handle = handle,
                displayName = profiles.displayNameForTenant(TenantContext.currentTenant()) ?: handle,
            )
        return postService.publishedDetail(slug).toPublic(author)
    }
}
