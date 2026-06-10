package com.gabrielaraujo.thothai.media

import com.gabrielaraujo.thothai.TestcontainersConfiguration
import com.gabrielaraujo.thothai.shared.InvalidRequestException
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.Primary
import org.springframework.mock.web.MockMultipartFile
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

/**
 * Testes de upload de mídia (RF03). O storage real é substituído por um [RecordingStorage] em
 * memória, então os testes não dependem de um MinIO no ar.
 */
@Import(TestcontainersConfiguration::class, MediaUploadTests.FakeStorageConfig::class)
@SpringBootTest
class MediaUploadTests {
    @Autowired
    private lateinit var mediaService: MediaService

    @Autowired
    private lateinit var mediaAssets: MediaAssetRepository

    @Autowired
    private lateinit var storage: ObjectStorage

    @BeforeEach
    fun cleanUp() {
        mediaAssets.deleteAll()
        (storage as RecordingStorage).stored.clear()
        (storage as RecordingStorage).deleted.clear()
        (storage as RecordingStorage).objects.clear()
    }

    /** PNG real (40x20, vermelho) para os testes de dimensões e edição. */
    private fun pngBytes(
        width: Int = 40,
        height: Int = 20,
    ): ByteArray {
        val image = java.awt.image.BufferedImage(width, height, java.awt.image.BufferedImage.TYPE_INT_RGB)
        val g = image.createGraphics()
        g.color = java.awt.Color.RED
        g.fillRect(0, 0, width, height)
        g.dispose()
        val out = java.io.ByteArrayOutputStream()
        javax.imageio.ImageIO.write(image, "png", out)
        return out.toByteArray()
    }

    @Test
    fun `upload de imagem valida persiste o asset e monta a url publica`() {
        val file = MockMultipartFile("file", "foto.png", "image/png", byteArrayOf(1, 2, 3))

        val asset = mediaService.upload(file)

        assertTrue(asset.objectKey.startsWith("images/default/"))
        assertTrue(asset.objectKey.endsWith(".png"))
        assertEquals("http://localhost:9000/thothai-media/${asset.objectKey}", asset.publicUrl)
        assertEquals("image/png", asset.contentType)
        assertEquals(3, asset.sizeBytes)
        assertEquals(1, mediaAssets.count())
        assertEquals(listOf(asset.objectKey), (storage as RecordingStorage).stored)
    }

    @Test
    fun `tipo nao suportado e rejeitado`() {
        val file = MockMultipartFile("file", "doc.pdf", "application/pdf", byteArrayOf(1))
        assertFailsWith<InvalidRequestException> { mediaService.upload(file) }
    }

    @Test
    fun `arquivo vazio e rejeitado`() {
        val file = MockMultipartFile("file", "vazio.png", "image/png", ByteArray(0))
        assertFailsWith<InvalidRequestException> { mediaService.upload(file) }
    }

    @Test
    fun `lista e exclui removendo do storage e do banco`() {
        val asset = mediaService.upload(MockMultipartFile("file", "foto.png", "image/png", byteArrayOf(1)))
        assertEquals(1, mediaService.list().size)

        mediaService.delete(requireNotNull(asset.id))

        assertEquals(0, mediaAssets.count())
        assertEquals(listOf(asset.objectKey), (storage as RecordingStorage).deleted)
    }

    @Test
    fun `upload extrai as dimensoes da imagem`() {
        val asset = mediaService.upload(MockMultipartFile("file", "foto.png", "image/png", pngBytes(40, 20)))
        assertEquals(40, asset.width)
        assertEquals(20, asset.height)
    }

    @Test
    fun `atualiza metadados e filtra por tag e busca`() {
        val foto = mediaService.upload(MockMultipartFile("file", "foto.png", "image/png", pngBytes()))
        mediaService.upload(MockMultipartFile("file", "logo.png", "image/png", pngBytes()))

        mediaService.update(
            requireNotNull(foto.id),
            MediaUpdateRequest(altText = "Diagrama de arquitetura", description = null, tags = listOf(" Arquitetura ", "diagrama")),
        )

        assertEquals(listOf("arquitetura", "diagrama"), mediaService.tags())
        assertEquals(1, mediaService.list(tag = "arquitetura").size)
        assertEquals(1, mediaService.list(query = "diagrama").size)
        assertEquals(2, mediaService.list().size)
    }

    @Test
    fun `edicao rotaciona corta e redimensiona criando nova midia`() {
        val original = mediaService.upload(MockMultipartFile("file", "foto.png", "image/png", pngBytes(40, 20)))
        mediaService.update(requireNotNull(original.id), MediaUpdateRequest(altText = "alt", description = null, tags = listOf("tag")))

        // Rotaciona 90° (40x20 -> 20x40), corta 20x20 e redimensiona para 16 de largura.
        val edited =
            mediaService.edit(
                requireNotNull(original.id),
                MediaEditRequest(rotate = 90, crop = CropRect(0, 0, 20, 20), targetWidth = 16),
            )

        assertEquals(16, edited.width)
        assertEquals(16, edited.height)
        assertEquals("foto (editada).png", edited.originalFilename)
        assertEquals("alt", edited.altText)
        assertEquals(setOf("tag"), edited.tags)
        // O original permanece intacto e as duas mídias existem.
        assertEquals(2, mediaAssets.count())
    }

    @Test
    fun `edicao sem transformacao e rejeitada`() {
        val original = mediaService.upload(MockMultipartFile("file", "foto.png", "image/png", pngBytes()))
        assertFailsWith<InvalidRequestException> {
            mediaService.edit(requireNotNull(original.id), MediaEditRequest())
        }
    }

    @TestConfiguration
    internal class FakeStorageConfig {
        @Bean
        @Primary
        internal fun recordingStorage(): ObjectStorage = RecordingStorage()
    }
}

/** Storage de teste em memória: registra as chaves e retém os bytes (suporta a edição de imagem). */
internal class RecordingStorage : ObjectStorage {
    val stored = mutableListOf<String>()
    val deleted = mutableListOf<String>()
    val objects = mutableMapOf<String, ByteArray>()

    override fun store(
        objectKey: String,
        data: ByteArray,
        contentType: String,
    ) {
        stored.add(objectKey)
        objects[objectKey] = data
    }

    override fun fetch(objectKey: String): ByteArray = objects.getValue(objectKey)

    override fun delete(objectKey: String) {
        deleted.add(objectKey)
        objects.remove(objectKey)
    }
}
