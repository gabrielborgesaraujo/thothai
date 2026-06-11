package com.gabrielaraujo.thothai.profile

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController

/**
 * Leitura pública da identidade (RF07) e do portfólio visível (RF08) de um publicador.
 * O tenant é resolvido pelo handle do caminho (TenantContextFilter); rotas GET liberadas
 * no SecurityConfig (prefixo /api/p).
 */
@RestController
internal class PublicPresenceController(
    private val profileService: ProfileService,
    private val portfolioService: PortfolioService,
) {
    @GetMapping("/api/p/{handle}/profile")
    fun profile(
        @PathVariable handle: String,
    ): ProfileResponse = profileService.get().toResponse()

    @GetMapping("/api/p/{handle}/portfolio")
    fun portfolio(
        @PathVariable handle: String,
    ): List<PortfolioEntryResponse> = portfolioService.listVisible().map { it.toResponse() }
}
