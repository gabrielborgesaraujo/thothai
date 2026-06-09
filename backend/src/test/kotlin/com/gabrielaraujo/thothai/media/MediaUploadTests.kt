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

    @TestConfiguration
    internal class FakeStorageConfig {
        @Bean
        @Primary
        internal fun recordingStorage(): ObjectStorage = RecordingStorage()
    }
}

/** Storage de teste que apenas registra as chaves enviadas e removidas. */
internal class RecordingStorage : ObjectStorage {
    val stored = mutableListOf<String>()
    val deleted = mutableListOf<String>()

    override fun store(
        objectKey: String,
        data: ByteArray,
        contentType: String,
    ) {
        stored.add(objectKey)
    }

    override fun delete(objectKey: String) {
        deleted.add(objectKey)
    }
}
