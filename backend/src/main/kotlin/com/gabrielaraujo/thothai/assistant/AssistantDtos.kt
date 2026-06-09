package com.gabrielaraujo.thothai.assistant

import jakarta.validation.constraints.NotBlank

/** Geração de rascunho com IA + busca viva (RF04). */
data class DraftRequest(
    @field:NotBlank
    val theme: String,
)

data class DraftResponse(
    val title: String,
    val summary: String?,
    val body: String,
    val sources: List<String>,
)

/** Revisão contextual por IA (RF05). */
data class ReviewRequest(
    @field:NotBlank
    val content: String,
)

data class ReviewResponse(
    val recommendations: List<String>,
)

/** Geração de "isca" para LinkedIn a partir de uma postagem (estratégia de distribuição). */
data class SnippetRequest(
    val title: String,
    val content: String,
)

data class SnippetResponse(
    val text: String,
)
