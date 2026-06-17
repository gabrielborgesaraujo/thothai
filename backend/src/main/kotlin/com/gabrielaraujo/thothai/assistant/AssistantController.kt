package com.gabrielaraujo.thothai.assistant

import jakarta.validation.Valid
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/** Situação da memória de publicações (RAG) do publicador. */
data class AuthorMemoryStatusResponse(
    val configured: Boolean,
    val indexed: Long,
    val total: Int,
)

/**
 * Endpoints da assistência de IA (RF04/RF05). Protegido por ROLE_ADMIN no SecurityConfig
 * (prefixo /api/admin). A memória do autor (RAG) é injetada como referência de estilo nos prompts.
 */
@RestController
@RequestMapping("/api/admin/assistant")
internal class AssistantController(
    private val assistantService: AssistantService,
    private val imageGenerationService: ImageGenerationService,
    private val promptHistory: PromptHistoryService,
    private val authorMemory: AuthorMemoryService,
) {
    @PostMapping("/draft")
    fun draft(
        @Valid @RequestBody request: DraftRequest,
    ): DraftResponse {
        val query = listOfNotNull(request.theme, request.instructions).joinToString(" ")
        val voice = runCatching { authorMemory.retrieveVoice(query) }.getOrDefault("")
        val draft = assistantService.generateDraft(request.theme, request.instructions, voice)
        // Registra o prompt usado (tema + instruções) para consulta/reuso posterior.
        promptHistory.record(
            PromptType.DRAFT,
            listOfNotNull(request.theme.trim(), request.instructions?.trim()?.takeIf { it.isNotBlank() })
                .joinToString(" — "),
        )
        return draft
    }

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
    ): SnippetResponse {
        val voice = runCatching { authorMemory.retrieveVoice("${request.title} ${request.content.take(500)}") }.getOrDefault("")
        return assistantService.generateSnippet(request.title, request.content, voice)
    }

    /** Adapta o conteúdo para um post nativo do LinkedIn, dentro do limite de caracteres. */
    @PostMapping("/linkedin-format")
    fun linkedInFormat(
        @RequestBody request: SnippetRequest,
    ): SnippetResponse {
        val voice = runCatching { authorMemory.retrieveVoice("${request.title} ${request.content.take(500)}") }.getOrDefault("")
        return assistantService.formatForLinkedIn(request.title, request.content, voice)
    }

    @PostMapping("/image")
    fun image(
        @Valid @RequestBody request: ImageRequest,
    ): ImageResponse {
        val image = imageGenerationService.generate(request.prompt)
        promptHistory.record(PromptType.IMAGE, request.prompt)
        return image
    }

    /** Situação da memória de publicações (config + quantos posts indexados). */
    @GetMapping("/memory")
    fun memoryStatus(): AuthorMemoryStatusResponse =
        authorMemory.status().let { AuthorMemoryStatusResponse(it.configured, it.indexed, it.total) }

    /** Reindexa todas as publicações do publicador (reconstrói a memória do autor). */
    @PostMapping("/memory/reindex")
    fun reindexMemory(): AuthorMemoryStatusResponse {
        authorMemory.reindexAll()
        return memoryStatus()
    }
}
