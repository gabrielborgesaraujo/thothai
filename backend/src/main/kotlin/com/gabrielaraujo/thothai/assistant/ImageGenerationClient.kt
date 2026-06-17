package com.gabrielaraujo.thothai.assistant

import com.fasterxml.jackson.annotation.JsonProperty
import com.gabrielaraujo.thothai.shared.ExternalServiceException
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.web.client.body
import java.util.Base64

/** Imagem gerada já decodificada: bytes prontos para o storage e o tipo MIME. */
internal data class GeneratedImage(
    val bytes: ByteArray,
    val contentType: String,
)

/**
 * Cliente de geração de imagem. Suporta OpenAI (`/images/generations`, base64) e Google Imagen
 * (`/models/{model}:predict`, base64). Falhas viram [ExternalServiceException] e nunca derrubam o
 * painel (RNF02). O timeout vem do mesmo [aiRestClient] das chamadas de chat.
 */
@Component
internal class ImageGenerationClient(
    @param:Qualifier("aiRestClient")
    private val restClient: RestClient,
) {
    fun generate(
        resolved: AiSettingsService.ResolvedImage,
        prompt: String,
    ): GeneratedImage =
        try {
            when (resolved.provider) {
                ImageProvider.OPENAI -> openAi(resolved, prompt)
                ImageProvider.GEMINI -> gemini(resolved, prompt)
            }
        } catch (ex: ExternalServiceException) {
            throw ex
        } catch (ex: Exception) {
            throw ExternalServiceException("Falha ao gerar a imagem", ex)
        }

    private fun openAi(
        resolved: AiSettingsService.ResolvedImage,
        prompt: String,
    ): GeneratedImage {
        val response =
            restClient
                .post()
                .uri("${resolved.baseUrl.trimEnd('/')}/images/generations")
                .header("Authorization", "Bearer ${resolved.apiKey}")
                .contentType(MediaType.APPLICATION_JSON)
                .body(mapOf("model" to resolved.model, "prompt" to prompt, "n" to 1, "size" to "1024x1024"))
                .retrieve()
                .body<OpenAiImageResponse>()
        val b64 =
            response?.data?.firstOrNull()?.b64Json
                ?: throw ExternalServiceException("O provedor de imagem não retornou nenhuma imagem")
        return GeneratedImage(decode(b64), "image/png")
    }

    private fun gemini(
        resolved: AiSettingsService.ResolvedImage,
        prompt: String,
    ): GeneratedImage {
        val response =
            restClient
                .post()
                .uri("${resolved.baseUrl.trimEnd('/')}/models/${resolved.model}:predict?key=${resolved.apiKey}")
                .contentType(MediaType.APPLICATION_JSON)
                .body(
                    mapOf(
                        "instances" to listOf(mapOf("prompt" to prompt)),
                        "parameters" to mapOf("sampleCount" to 1),
                    ),
                ).retrieve()
                .body<GeminiImageResponse>()
        val prediction =
            response?.predictions?.firstOrNull()?.takeIf { !it.bytesBase64Encoded.isNullOrBlank() }
                ?: throw ExternalServiceException("O provedor de imagem não retornou nenhuma imagem")
        return GeneratedImage(decode(prediction.bytesBase64Encoded!!), prediction.mimeType ?: "image/png")
    }

    private fun decode(b64: String): ByteArray = Base64.getDecoder().decode(b64.substringAfter("base64,", b64))
}

internal data class OpenAiImageResponse(
    val data: List<OpenAiImageData> = emptyList(),
)

internal data class OpenAiImageData(
    @param:JsonProperty("b64_json")
    val b64Json: String? = null,
    val url: String? = null,
)

internal data class GeminiImageResponse(
    val predictions: List<GeminiPrediction> = emptyList(),
)

internal data class GeminiPrediction(
    val bytesBase64Encoded: String? = null,
    val mimeType: String? = null,
)
