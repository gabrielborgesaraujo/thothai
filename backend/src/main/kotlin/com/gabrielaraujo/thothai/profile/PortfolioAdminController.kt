package com.gabrielaraujo.thothai.profile

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/**
 * CRUD das entradas de portfólio no painel (RF08). Protegido por ROLE_ADMIN no SecurityConfig
 * (prefixo /api/admin).
 */
@RestController
@RequestMapping("/api/admin/portfolio")
internal class PortfolioAdminController(
    private val portfolioService: PortfolioService,
) {
    @GetMapping
    fun list(): List<PortfolioEntryResponse> = portfolioService.list().map { it.toResponse() }

    @GetMapping("/{id}")
    fun get(
        @PathVariable id: UUID,
    ): PortfolioEntryResponse = portfolioService.get(id).toResponse()

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @Valid @RequestBody request: PortfolioEntryRequest,
    ): PortfolioEntryResponse = portfolioService.create(request).toResponse()

    @PutMapping("/{id}")
    fun update(
        @PathVariable id: UUID,
        @Valid @RequestBody request: PortfolioEntryRequest,
    ): PortfolioEntryResponse = portfolioService.update(id, request).toResponse()

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(
        @PathVariable id: UUID,
    ) = portfolioService.delete(id)
}
