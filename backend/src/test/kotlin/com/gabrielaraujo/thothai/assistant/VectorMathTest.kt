package com.gabrielaraujo.thothai.assistant

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Teste puro da similaridade de cosseno usada na recuperação da memória do autor (RAG). */
class VectorMathTest {
    @Test
    fun `vetores idênticos têm similaridade 1`() {
        val v = listOf(0.1, 0.2, 0.3)
        assertEquals(1.0, cosineSimilarity(v, doubleArrayOf(0.1, 0.2, 0.3)), 1e-9)
    }

    @Test
    fun `vetores ortogonais têm similaridade 0`() {
        assertEquals(0.0, cosineSimilarity(listOf(1.0, 0.0), doubleArrayOf(0.0, 1.0)), 1e-9)
    }

    @Test
    fun `mais parecido pontua mais alto`() {
        val query = listOf(1.0, 1.0, 0.0)
        val similar = cosineSimilarity(query, doubleArrayOf(0.9, 1.0, 0.1))
        val distinct = cosineSimilarity(query, doubleArrayOf(0.0, 0.1, 1.0))
        assertTrue(similar > distinct)
    }

    @Test
    fun `vetor nulo não quebra (retorna 0)`() {
        assertEquals(0.0, cosineSimilarity(emptyList(), doubleArrayOf()), 1e-9)
        assertEquals(0.0, cosineSimilarity(listOf(0.0, 0.0), doubleArrayOf(1.0, 1.0)), 1e-9)
    }
}
