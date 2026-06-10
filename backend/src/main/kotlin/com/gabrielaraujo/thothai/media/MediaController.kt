package com.gabrielaraujo.thothai.media

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
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
    fun list(
        @RequestParam(required = false) q: String?,
        @RequestParam(required = false) tag: String?,
    ): List<MediaSummaryResponse> = mediaService.list(q, tag).map { it.toSummary() }

    /** Tags em uso na galeria (chips de filtro). */
    @GetMapping("/tags")
    fun tags(): List<String> = mediaService.tags()

    @PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    @ResponseStatus(HttpStatus.CREATED)
    fun upload(
        @RequestParam("file") file: MultipartFile,
    ): MediaResponse = mediaService.upload(file).toResponse()

    /** Metadados editáveis (alt, descrição, tags). */
    @PutMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody request: MediaUpdateRequest,
    ): MediaSummaryResponse = mediaService.update(id, request).toSummary()

    /** Edição de imagem no servidor (rotação/corte/redimensionamento) — cria uma nova mídia. */
    @PostMapping("/{id}/edits")
    @ResponseStatus(HttpStatus.CREATED)
    fun edit(
        @PathVariable id: UUID,
        @Valid @RequestBody request: MediaEditRequest,
    ): MediaSummaryResponse = mediaService.edit(id, request).toSummary()

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(
        @PathVariable id: UUID,
    ) = mediaService.delete(id)
}
