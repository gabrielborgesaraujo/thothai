package com.gabrielaraujo.thothai.content

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/**
 * CRUD de postagens para o painel administrativo (RF02). Protegido por ROLE_ADMIN no SecurityConfig
 * (todas as rotas sob /api/admin).
 */
@RestController
@RequestMapping("/api/admin/posts")
internal class AdminPostController(
    private val postService: PostService,
) {
    @GetMapping
    fun list(): List<PostSummaryResponse> = postService.list().map { it.toSummary() }

    @GetMapping("/{id}")
    fun get(
        @PathVariable id: UUID,
    ): PostResponse = postService.get(id).toResponse()

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @Valid @RequestBody request: PostRequest,
    ): PostResponse = postService.create(request).toResponse()

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody request: PostRequest,
    ): PostResponse = postService.update(id, request).toResponse()

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(
        @PathVariable id: UUID,
    ) = postService.delete(id)
}
