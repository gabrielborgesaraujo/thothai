package com.gabrielaraujo.thothai.assistant

import jakarta.validation.Valid
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * Endpoints da assistência de IA (RF04/RF05). Protegido por ROLE_ADMIN no SecurityConfig
 * (prefixo /api/admin).
 */
@RestController
@RequestMapping("/api/admin/assistant")
internal class AssistantController(
    private val assistantService: AssistantService,
    private val imageGenerationService: ImageGenerationService,
) {
    @PostMapping("/draft")
    fun draft(
        @Valid @RequestBody request: DraftRequest,
    ): DraftResponse = assistantService.generateDraft(request.theme, request.instructions)

    @PostMapping("/review")
    fun review(
        @Valid @RequestBody request: ReviewRequest,
    ): ReviewResponse = assistantService.review(request.content)

    @PostMapping("/apply-review")
    fun applyReview(
        @Valid @RequestBody request: ReviewRequest,
    ): CorrectionResponse = assistantService.applyReview(request.content)

    @PostMapping("/snippet")
    fun snippet(
        @RequestBody request: SnippetRequest,
    ): SnippetResponse = assistantService.generateSnippet(request.title, request.content)

    @PostMapping("/image")
    fun image(
        @Valid @RequestBody request: ImageRequest,
    ): ImageResponse = imageGenerationService.generate(request.prompt)
}
