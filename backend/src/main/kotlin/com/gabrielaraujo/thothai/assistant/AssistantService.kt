package com.gabrielaraujo.thothai.assistant

import com.gabrielaraujo.thothai.shared.InvalidRequestException
import org.springframework.stereotype.Service
import tools.jackson.databind.ObjectMapper

/**
 * Orquestra a assistência de IA (RF04 geração de rascunho com busca viva; RF05 revisão contextual).
 * O parsing das respostas do LLM é tolerante — sempre há um fallback, então um JSON malformado não
 * derruba a operação.
 */
@Service
internal class AssistantService(
    private val llm: LlmClient,
    private val search: SearchClient,
    private val objectMapper: ObjectMapper,
) {
    fun generateDraft(theme: String): DraftResponse {
        val cleaned = theme.trim()
        if (cleaned.isBlank()) {
            throw InvalidRequestException("Informe um tema para o rascunho")
        }

        // Busca best-effort: qualquer falha degrada para contexto vazio, sem quebrar o rascunho (RNF02).
        val results = runCatching { search.search(cleaned) }.getOrDefault(emptyList())
        val context =
            results.joinToString("\n\n") { "- ${it.title} (${it.url})\n${it.content}" }

        val user =
            buildString {
                append("Tema: ").append(cleaned).append("\n\n")
                if (context.isNotBlank()) {
                    append("Contexto encontrado na web (use como base, cite quando relevante):\n")
                    append(context).append("\n\n")
                }
                append(
                    "Gere um rascunho técnico em português. Responda APENAS com um objeto JSON " +
                        "{\"title\": ..., \"summary\": ..., \"body\": ...}, onde body é o conteúdo em Markdown.",
                )
            }

        val raw = llm.complete(DRAFT_SYSTEM, user, maxTokens = 4096)
        val parsed = parseDraft(raw, fallbackTitle = cleaned)
        return DraftResponse(parsed.title, parsed.summary, parsed.body, results.map { it.url })
    }

    fun review(content: String): ReviewResponse {
        val cleaned = content.trim()
        if (cleaned.isBlank()) {
            throw InvalidRequestException("Informe o conteúdo a revisar")
        }
        val raw = llm.complete(REVIEW_SYSTEM, cleaned, maxTokens = 2048)
        return ReviewResponse(parseRecommendations(raw))
    }

    /** Gera uma "isca" para LinkedIn (RF04/estratégia de distribuição): gancho + CTA de volta ao portal. */
    fun generateSnippet(
        title: String,
        content: String,
    ): SnippetResponse {
        if (title.isBlank() && content.isBlank()) {
            throw InvalidRequestException("Informe o título ou o conteúdo da postagem")
        }
        val user =
            buildString {
                append("Título: ").append(title.trim()).append("\n\n")
                append("Conteúdo:\n").append(content.trim())
            }
        return SnippetResponse(llm.complete(SNIPPET_SYSTEM, user, maxTokens = 512))
    }

    private fun parseDraft(
        raw: String,
        fallbackTitle: String,
    ): ParsedDraft {
        extractJson(raw, '{', '}')?.let { json ->
            runCatching {
                @Suppress("UNCHECKED_CAST")
                val map = objectMapper.readValue(json, Map::class.java) as Map<String, Any?>
                val body = (map["body"] as? String)?.takeIf { it.isNotBlank() }
                if (body != null) {
                    return ParsedDraft(
                        title = (map["title"] as? String)?.takeIf { it.isNotBlank() } ?: fallbackTitle,
                        summary = (map["summary"] as? String)?.takeIf { it.isNotBlank() },
                        body = body,
                    )
                }
            }
        }
        return ParsedDraft(fallbackTitle, summary = null, body = raw.trim())
    }

    private fun parseRecommendations(raw: String): List<String> {
        extractJson(raw, '[', ']')?.let { json ->
            runCatching {
                val list = objectMapper.readValue(json, List::class.java)
                val items = list.mapNotNull { it as? String }.map { it.trim() }.filter { it.isNotBlank() }
                if (items.isNotEmpty()) {
                    return items
                }
            }
        }
        // Fallback: uma recomendação por linha, removendo marcadores comuns.
        return raw
            .lines()
            .map {
                it
                    .trim()
                    .removePrefix("-")
                    .removePrefix("*")
                    .trim()
            }.filter { it.isNotBlank() }
    }

    private fun extractJson(
        raw: String,
        open: Char,
        close: Char,
    ): String? {
        val start = raw.indexOf(open)
        val end = raw.lastIndexOf(close)
        return if (start in 0 until end) raw.substring(start, end + 1) else null
    }

    private data class ParsedDraft(
        val title: String,
        val summary: String?,
        val body: String,
    )

    private companion object {
        const val DRAFT_SYSTEM =
            "Você é um assistente de escrita técnica. Estruture rascunhos claros, corretos e bem " +
                "organizados em Markdown. Responda somente com o JSON solicitado, sem texto extra."
        const val REVIEW_SYSTEM =
            "Você é um revisor técnico. Analise o texto e gere recomendações objetivas de correção " +
                "ortográfica, gramatical e de vocabulário técnico. Responda somente com um array JSON de " +
                "strings, cada uma uma recomendação curta, sem texto extra."
        const val SNIPPET_SYSTEM =
            "Você cria 'iscas de conteúdo' para o LinkedIn a partir de uma publicação técnica. Escreva um " +
                "texto curto e envolvente em português (gancho na 1ª linha, 2 a 3 linhas de valor e um " +
                "call-to-action convidando a ler o artigo completo no portal). Responda apenas com o texto " +
                "do post, sem aspas nem comentários."
    }
}
