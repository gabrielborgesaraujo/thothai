package com.gabrielaraujo.thothai.assistant

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.util.UUID

/** Acesso ao histórico de prompts. Visível apenas dentro do módulo `assistant`. */
internal interface PromptHistoryRepository : JpaRepository<PromptHistory, UUID> {
    fun findByTenantIdAndId(
        tenantId: String,
        id: UUID,
    ): PromptHistory?

    /**
     * Histórico filtrável: por tipo (nulo = todos), só favoritos (false = todos) e busca textual
     * ('' desativa). Favoritos primeiro, depois mais recentes.
     */
    @Query(
        """
        SELECT p FROM PromptHistory p
        WHERE p.tenantId = :tenantId
          AND (:type IS NULL OR p.type = :type)
          AND (:favoritesOnly = false OR p.favorite = true)
          AND (:q = '' OR LOWER(p.prompt) LIKE CONCAT('%', :q, '%'))
        ORDER BY p.favorite DESC, p.createdAt DESC
        """,
    )
    fun search(
        tenantId: String,
        type: PromptType?,
        favoritesOnly: Boolean,
        q: String,
    ): List<PromptHistory>
}
