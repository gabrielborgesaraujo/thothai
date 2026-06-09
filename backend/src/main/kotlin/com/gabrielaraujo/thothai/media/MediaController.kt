package com.gabrielaraujo.thothai.media

import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

/**
 * Upload de mídias incorporadas (RF03). Protegido por ROLE_ADMIN no SecurityConfig
 * (prefixo /api/admin).
 */
@RestController
@RequestMapping("/api/admin/media")
internal class MediaController(
    private val mediaService: MediaService,
) {
    @GetMapping
    fun list(): List<MediaSummaryResponse> = mediaService.list().map { it.toSummary() }

    @PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    @ResponseStatus(HttpStatus.CREATED)
    fun upload(
        @RequestParam("file") file: MultipartFile,
    ): MediaResponse = mediaService.upload(file).toResponse()

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(
        @PathVariable id: UUID,
    ) = mediaService.delete(id)
}
