package com.gabrielaraujo.thothai.profile

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

/**
 * Leitura pública da identidade (RF07) e do portfólio visível (RF08). Rotas GET liberadas no
 * SecurityConfig (/api/profile e prefixo /api/portfolio).
 */
@RestController
internal class PublicPresenceController(
    private val profileService: ProfileService,
    private val portfolioService: PortfolioService,
) {
    @GetMapping("/api/profile")
    fun profile(): ProfileResponse = profileService.get().toResponse()

    @GetMapping("/api/portfolio")
    fun portfolio(): List<PortfolioEntryResponse> = portfolioService.listVisible().map { it.toResponse() }
}
