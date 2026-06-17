package com.gabrielaraujo.thothai.assistant

import com.gabrielaraujo.thothai.content.ContentQueries
import com.gabrielaraujo.thothai.shared.InvalidRequestException
import com.gabrielaraujo.thothai.shared.TenantContext
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper
import java.security.MessageDigest

/**
 * Memória de publicações por autor (RAG). Indexa as publicações do tenant com embeddings (config
 * dedicada) e recupera os trechos mais parecidos com a consulta para que a IA escreva no tom e na
 * abordagem do autor. A indexação é sob demanda e incremental (só posts novos/alterados), evitando
 * eventos/async; a similaridade de cosseno é calculada na aplicação (volume por usuário é pequeno).
 * Degrada graciosamente: sem config de embeddings, a memória fica desligada (retorna vazio).
 */
@Service
internal class AuthorMemoryService(
    private val settings: AiSettingsService,
    private val client: EmbeddingClient,
    private val embeddings: PostEmbeddingRepository,
    private val content: ContentQueries,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /** Situação da memória do autor para o painel. */
    data class MemoryStatus(
        val configured: Boolean,
        val indexed: Long,
        val total: Int,
    )

    @Transactional(readOnly = true)
    fun status(): MemoryStatus =
        MemoryStatus(
            configured = settings.resolveEmbedding() != null,
            indexed = embeddings.countByTenantId(TenantContext.currentTenant()),
            total = content.authorPostTexts().size,
        )

    /**
     * Recupera trechos das publicações mais parecidas com a consulta (referência de estilo). Mantém
     * o índice fresco antes. Best-effort: qualquer falha de embedding devolve vazio (sem voz).
     */
    @Transactional
    fun retrieveVoice(
        query: String,
        topK: Int = DEFAULT_TOP_K,
    ): String {
        val resolved = settings.resolveEmbedding() ?: return ""
        if (query.isBlank()) {
            return ""
        }
        ensureIndexed(resolved)
        val stored = embeddings.findByTenantId(TenantContext.currentTenant())
        if (stored.isEmpty()) {
            return ""
        }
        val queryVector = runCatching { client.embed(resolved, query) }.getOrElse { return "" }
        val byPost = content.authorPostTexts().associateBy { it.postId }
        val top =
            stored
                .mapNotNull { row ->
                    byPost[row.postId]?.let { it to cosineSimilarity(queryVector, parse(row.embedding)) }
                }.sortedByDescending { it.second }
                .take(topK)
                .map { it.first }
        if (top.isEmpty()) {
            return ""
        }
        return top.joinToString("\n\n") { "- \"${it.title}\": ${it.text.take(EXCERPT_CHARS)}" }
    }

    /** Reindexação completa sob demanda (painel): apaga e reconstrói os embeddings do tenant. */
    @Transactional
    fun reindexAll(): Int {
        val resolved =
            settings.resolveEmbedding()
                ?: throw InvalidRequestException("Configure os embeddings (memória do autor) em Integrações")
        val tenant = TenantContext.currentTenant()
        embeddings.findByTenantId(tenant).forEach { embeddings.delete(it) }
        embeddings.flush()
        ensureIndexed(resolved)
        return embeddings.countByTenantId(tenant).toInt()
    }

    /** Embeda as publicações novas/alteradas (incremental). Falhas individuais são puladas. */
    private fun ensureIndexed(resolved: AiSettingsService.ResolvedEmbedding) {
        val tenant = TenantContext.currentTenant()
        val existing = embeddings.findByTenantId(tenant).associateBy { it.postId }
        for (post in content.authorPostTexts()) {
            val hash = sha256(post.text)
            val current = existing[post.postId]
            if (current != null && current.sourceHash == hash && current.model == resolved.model) {
                continue
            }
            val vector =
                runCatching { client.embed(resolved, post.text) }.getOrElse {
                    log.warn("Falha ao indexar embedding do post {} — pulando", post.postId)
                    continue
                }
            val json = objectMapper.writeValueAsString(vector)
            if (current == null) {
                embeddings.save(PostEmbedding(post.postId, hash, resolved.model, json))
            } else {
                current.sourceHash = hash
                current.model = resolved.model
                current.embedding = json
            }
        }
    }

    private fun parse(json: String): DoubleArray = objectMapper.readValue(json, DoubleArray::class.java)

    private fun sha256(value: String): String =
        MessageDigest
            .getInstance("SHA-256")
            .digest(value.toByteArray())
            .joinToString("") { "%02x".format(it) }

    private companion object {
        const val DEFAULT_TOP_K = 3
        const val EXCERPT_CHARS = 600
    }
}
