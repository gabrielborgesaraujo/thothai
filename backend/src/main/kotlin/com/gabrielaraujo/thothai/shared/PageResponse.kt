package com.gabrielaraujo.thothai.shared

import org.springframework.data.domain.Page

/**
 * Contrato estável de resposta paginada — evita serializar o `Page` do Spring diretamente
 * (cujo formato JSON é instável entre versões).
 */
data class PageResponse<T>(
    val items: List<T>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
) {
    companion object {
        fun <S : Any, T : Any> from(
            page: Page<S>,
            mapper: (S) -> T,
        ): PageResponse<T> =
            PageResponse(
                items = page.content.map(mapper),
                page = page.number,
                size = page.size,
                totalElements = page.totalElements,
                totalPages = page.totalPages,
            )
    }
}
