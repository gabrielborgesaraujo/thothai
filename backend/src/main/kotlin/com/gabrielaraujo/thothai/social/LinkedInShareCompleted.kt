package com.gabrielaraujo.thothai.social

import java.util.UUID

/**
 * Evento de aplicação publicado após um compartilhamento bem-sucedido no LinkedIn vinculado a
 * uma postagem — consumido pelo módulo de conteúdo para marcar o badge no painel.
 */
data class LinkedInShareCompleted(
    val postId: UUID,
    val linkedInPostId: String,
)
