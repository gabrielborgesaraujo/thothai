package com.gabrielaraujo.thothai.assistant

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.time.Instant
import java.util.UUID

/** Item do histórico de prompts. */
data class PromptHistoryResponse(
    val id: UUID,
    val type: PromptType,
    val prompt: String,
    val favorite: Boolean,
    val createdAt: Instant?,
)

internal fun PromptHistory.toResponse() =
    PromptHistoryResponse(
        id = requireNotNull(id),
        type = type,
        prompt = prompt,
        favorite = favorite,
        createdAt = createdAt,
    )

/** Consulta e curadoria do histórico de prompts do publicador (ROLE_ADMIN — prefixo /api/admin). */
@RestController
@RequestMapping("/api/admin/assistant/prompts")
internal class PromptHistoryController(
    private val service: PromptHistoryService,
) {
    @GetMapping
    fun list(
        @RequestParam(required = false) type: PromptType?,
        @RequestParam(required = false, defaultValue = "false") favoritesOnly: Boolean,
        @RequestParam(required = false) q: String?,
    ): List<PromptHistoryResponse> = service.list(type, favoritesOnly, q).map { it.toResponse() }

    @PutMapping("/{id}/favorite")
    fun setFavorite(
        @PathVariable id: UUID,
        @RequestParam favorite: Boolean,
    ): PromptHistoryResponse = service.setFavorite(id, favorite).toResponse()

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(
        @PathVariable id: UUID,
    ) = service.delete(id)
}
