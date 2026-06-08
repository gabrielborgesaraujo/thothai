package com.gabrielaraujo.thothai.content

import java.text.Normalizer

/** Utilitário interno para derivar slugs amigáveis (e estáveis) a partir de títulos. */
internal object Slugs {
    private val combiningMarks = Regex("\\p{M}+")
    private val nonAlphanumeric = Regex("[^a-z0-9]+")

    fun slugify(input: String): String {
        val withoutAccents =
            Normalizer.normalize(input, Normalizer.Form.NFD).replace(combiningMarks, "")
        return withoutAccents
            .lowercase()
            .replace(nonAlphanumeric, "-")
            .trim('-')
            .ifBlank { "post" }
    }
}
