package com.gabrielaraujo.thothai.assistant

import kotlin.math.sqrt

/**
 * Similaridade de cosseno entre dois vetores (memória do autor / RAG). Compara até o menor
 * comprimento e retorna 0 quando algum vetor é nulo, evitando divisão por zero.
 */
internal fun cosineSimilarity(
    a: List<Double>,
    b: DoubleArray,
): Double {
    val n = minOf(a.size, b.size)
    if (n == 0) {
        return 0.0
    }
    var dot = 0.0
    var normA = 0.0
    var normB = 0.0
    for (i in 0 until n) {
        dot += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
    }
    val denominator = sqrt(normA) * sqrt(normB)
    return if (denominator == 0.0) 0.0 else dot / denominator
}
