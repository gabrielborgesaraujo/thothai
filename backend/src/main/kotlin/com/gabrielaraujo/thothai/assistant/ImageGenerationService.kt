package com.gabrielaraujo.thothai.assistant

import com.gabrielaraujo.thothai.media.MediaImageStore
import com.gabrielaraujo.thothai.shared.InvalidRequestException
import org.springframework.stereotype.Service

/**
 * Geração de imagem por IA: resolve a configuração dedicada do tenant, chama o provedor e salva o
 * resultado na galeria (módulo de mídia) — devolvendo a URL pública para o editor inserir no corpo
 * ou usar como banner.
 */
@Service
internal class ImageGenerationService(
    private val settings: AiSettingsService,
    private val client: ImageGenerationClient,
    private val imageStore: MediaImageStore,
) {
    fun generate(prompt: String): ImageResponse {
        val cleaned = prompt.trim()
        if (cleaned.isBlank()) {
            throw InvalidRequestException("Informe uma descrição para a imagem")
        }
        val resolved = settings.resolveImage()
        val image = client.generate(resolved, cleaned)
        val stored = imageStore.store(image.bytes, image.contentType, "ia-${cleaned.take(40)}")
        return ImageResponse(url = stored.url, width = stored.width, height = stored.height)
    }
}
