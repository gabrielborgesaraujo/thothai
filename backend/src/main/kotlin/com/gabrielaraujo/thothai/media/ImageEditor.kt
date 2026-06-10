package com.gabrielaraujo.thothai.media

import com.gabrielaraujo.thothai.shared.InvalidRequestException
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import javax.imageio.ImageIO

/**
 * Transformações de imagem no servidor (rotação → corte → redimensionamento), via AWT/ImageIO.
 * Editar no servidor evita restrições de CORS/canvas no navegador e mantém o original intacto.
 */
internal object ImageEditor {
    const val MAX_TARGET_WIDTH = 4096
    const val MIN_TARGET_WIDTH = 16

    /** Formatos que o ImageIO consegue reescrever; outros (ex.: webp) saem como PNG. */
    private val WRITABLE_FORMATS = mapOf("image/png" to "png", "image/jpeg" to "jpg", "image/gif" to "gif")

    data class Result(
        val bytes: ByteArray,
        val contentType: String,
        val width: Int,
        val height: Int,
    )

    /** Lê apenas as dimensões; nulo quando o formato não é decodificável (ex.: webp sem plugin). */
    fun dimensionsOf(data: ByteArray): Pair<Int, Int>? =
        runCatching { ImageIO.read(ByteArrayInputStream(data)) }
            .getOrNull()
            ?.let { it.width to it.height }

    fun transform(
        data: ByteArray,
        contentType: String,
        rotateDegrees: Int,
        crop: CropRect?,
        targetWidth: Int?,
    ): Result {
        require(rotateDegrees in setOf(0, 90, 180, 270)) { "Rotação deve ser 0, 90, 180 ou 270 graus" }
        var image =
            runCatching { ImageIO.read(ByteArrayInputStream(data)) }.getOrNull()
                ?: throw InvalidRequestException("Formato de imagem não suportado para edição")

        if (rotateDegrees != 0) {
            image = rotate(image, rotateDegrees)
        }
        if (crop != null) {
            image = crop(image, crop)
        }
        if (targetWidth != null && targetWidth != image.width) {
            if (targetWidth < MIN_TARGET_WIDTH || targetWidth > MAX_TARGET_WIDTH) {
                throw InvalidRequestException("Largura final deve estar entre $MIN_TARGET_WIDTH e $MAX_TARGET_WIDTH px")
            }
            image = resize(image, targetWidth)
        }

        val format = WRITABLE_FORMATS[contentType] ?: "png"
        val outputContentType = if (WRITABLE_FORMATS.containsKey(contentType)) contentType else "image/png"
        // JPEG não tem canal alfa: achata sobre fundo branco antes de gravar.
        val writable = if (format == "jpg") flatten(image) else image
        val output = ByteArrayOutputStream()
        if (!ImageIO.write(writable, format, output)) {
            throw InvalidRequestException("Não foi possível gravar a imagem editada")
        }
        return Result(
            bytes = output.toByteArray(),
            contentType = outputContentType,
            width = image.width,
            height = image.height,
        )
    }

    private fun rotate(
        image: BufferedImage,
        degrees: Int,
    ): BufferedImage {
        val quarterTurns = degrees / 90
        val (newW, newH) = if (quarterTurns % 2 == 1) image.height to image.width else image.width to image.height
        val rotated = BufferedImage(newW, newH, imageType(image))
        val g = rotated.createGraphics()
        g.translate((newW - image.width) / 2.0, (newH - image.height) / 2.0)
        g.rotate(Math.toRadians(degrees.toDouble()), image.width / 2.0, image.height / 2.0)
        g.drawImage(image, 0, 0, null)
        g.dispose()
        return rotated
    }

    private fun crop(
        image: BufferedImage,
        rect: CropRect,
    ): BufferedImage {
        val x = rect.x.coerceIn(0, image.width - 1)
        val y = rect.y.coerceIn(0, image.height - 1)
        val w = rect.width.coerceIn(1, image.width - x)
        val h = rect.height.coerceIn(1, image.height - y)
        // Cópia real (getSubimage compartilha o raster e quebra o ImageIO.write em alguns formatos).
        val cropped = BufferedImage(w, h, imageType(image))
        val g = cropped.createGraphics()
        g.drawImage(image.getSubimage(x, y, w, h), 0, 0, null)
        g.dispose()
        return cropped
    }

    private fun resize(
        image: BufferedImage,
        targetWidth: Int,
    ): BufferedImage {
        val targetHeight = (image.height.toDouble() * targetWidth / image.width).toInt().coerceAtLeast(1)
        val resized = BufferedImage(targetWidth, targetHeight, imageType(image))
        val g = resized.createGraphics()
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR)
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY)
        g.drawImage(image, 0, 0, targetWidth, targetHeight, null)
        g.dispose()
        return resized
    }

    private fun flatten(image: BufferedImage): BufferedImage {
        val flat = BufferedImage(image.width, image.height, BufferedImage.TYPE_INT_RGB)
        val g = flat.createGraphics()
        g.color = java.awt.Color.WHITE
        g.fillRect(0, 0, image.width, image.height)
        g.drawImage(image, 0, 0, null)
        g.dispose()
        return flat
    }

    private fun imageType(image: BufferedImage): Int =
        if (image.colorModel.hasAlpha()) BufferedImage.TYPE_INT_ARGB else BufferedImage.TYPE_INT_RGB
}
