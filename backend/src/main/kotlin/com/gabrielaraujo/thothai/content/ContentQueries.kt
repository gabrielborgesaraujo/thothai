package com.gabrielaraujo.thothai.content

import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

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
}
