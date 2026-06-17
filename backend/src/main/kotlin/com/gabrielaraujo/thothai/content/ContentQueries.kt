package com.gabrielaraujo.thothai.content

import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/** Texto de uma publicação para indexação da memória do autor (módulo assistant). */
data class AuthorPostText(
    val postId: UUID,
    val title: String,
    val text: String,
)

/**
 * API pública do módulo de conteúdo para consultas de outros módulos (Spring Modulith).
 * Mantém o [PostRepository] interno encapsulado.
 */
@Service
class ContentQueries internal constructor(
    private val posts: PostRepository,
) {
    /** Quantas postagens referenciam a URL de mídia (banner ou corpo) — protege exclusões na galeria. */
    @Transactional(readOnly = true)
    fun mediaUsageCount(url: String): Long = posts.countMediaUsage(TenantContext.currentTenant(), url)

    /**
     * Texto das publicações do tenant corrente para a memória do autor (RAG). Concatena título,
     * resumo e corpo (truncado), descartando posts sem corpo útil.
     */
    @Transactional(readOnly = true)
    fun authorPostTexts(): List<AuthorPostText> =
        posts.findByTenantId(TenantContext.currentTenant()).map { post ->
            val text =
                buildString {
                    append(post.title).append('\n')
                    post.summary?.takeIf { it.isNotBlank() }?.let { append(it).append('\n') }
                    append(post.body)
                }.take(MAX_EMBEDDING_CHARS)
            AuthorPostText(postId = requireNotNull(post.id), title = post.title, text = text)
        }

    private companion object {
        const val MAX_EMBEDDING_CHARS = 4000
    }
}
