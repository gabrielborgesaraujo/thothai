package com.gabrielaraujo.thothai.assistant

import com.gabrielaraujo.thothai.shared.AbstractTenantEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table

/** Tipo do prompt registrado no histórico. */
enum class PromptType {
    /** Tema (+ instruções) de geração de rascunho. */
    DRAFT,

    /** Descrição de geração de imagem. */
    IMAGE,
}

/**
 * Prompt de IA usado por um publicador, guardado para consulta/reuso. Pode ser favoritado.
 * Isolado por tenant ([AbstractTenantEntity]) — RNF03.
 */
@Entity
@Table(name = "prompt_history")
class PromptHistory(
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 16)
    var type: PromptType,
    @Column(name = "prompt", nullable = false)
    var prompt: String,
    @Column(name = "favorite", nullable = false)
    var favorite: Boolean = false,
) : AbstractTenantEntity()
