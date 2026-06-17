package com.gabrielaraujo.thothai.assistant

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/** Geração de rascunho com IA + busca viva (RF04). */
data class DraftRequest(
    @field:NotBlank
    val theme: String,
    /** Instrução livre do usuário para guiar o estilo/foco do rascunho (modelo flexível). */
    @field:Size(max = 2000)
    val instructions: String? = null,
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

/** Texto corrigido pela IA (revisão aplicável — o painel mostra antes/depois). */
data class CorrectionResponse(
    val text: String,
)

/** Geração de "isca" para LinkedIn a partir de uma postagem (estratégia de distribuição). */
data class SnippetRequest(
    val title: String,
    val content: String,
)

data class SnippetResponse(
    val text: String,
)

/** Geração de imagem por IA a partir de uma descrição (modelo flexível). */
data class ImageRequest(
    @field:NotBlank
    @field:Size(max = 2000)
    val prompt: String,
)

data class ImageResponse(
    val url: String,
    val width: Int?,
    val height: Int?,
)
