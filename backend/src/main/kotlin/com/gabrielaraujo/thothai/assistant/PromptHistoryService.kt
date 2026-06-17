package com.gabrielaraujo.thothai.assistant

import com.gabrielaraujo.thothai.shared.ResourceNotFoundException
import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/** Histórico de prompts de IA: registro automático ao gerar, consulta com filtros e favoritos. */
@Service
@Transactional
internal class PromptHistoryService(
    private val repository: PromptHistoryRepository,
) {
    /** Registra um prompt usado (best-effort: prompts em branco são ignorados). */
    fun record(
        type: PromptType,
        prompt: String,
    ) {
        val cleaned = prompt.trim()
        if (cleaned.isBlank()) {
            return
        }
        repository.save(PromptHistory(type = type, prompt = cleaned.take(MAX_PROMPT_LENGTH)))
    }

    @Transactional(readOnly = true)
    fun list(
        type: PromptType? = null,
        favoritesOnly: Boolean = false,
        query: String? = null,
    ): List<PromptHistory> =
        repository.search(
            TenantContext.currentTenant(),
            type,
            favoritesOnly,
            query?.trim()?.lowercase().orEmpty(),
        )

    fun setFavorite(
        id: UUID,
        favorite: Boolean,
    ): PromptHistory {
        val entry = find(id)
        entry.favorite = favorite
        return entry
    }

    fun delete(id: UUID) {
        repository.delete(find(id))
    }

    private fun find(id: UUID): PromptHistory =
        repository.findByTenantIdAndId(TenantContext.currentTenant(), id)
            ?: throw ResourceNotFoundException("Prompt não encontrado")

    private companion object {
        const val MAX_PROMPT_LENGTH = 4000
    }
}
