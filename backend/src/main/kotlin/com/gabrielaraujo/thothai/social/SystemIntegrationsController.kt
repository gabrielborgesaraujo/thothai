package com.gabrielaraujo.thothai.social

import jakarta.validation.Valid
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * Integrações MACRO da plataforma (Fase 2): credenciais do app LinkedIn, compartilhadas por
 * todos os publicadores. Protegido por ROLE_SYSTEM_ADMIN (prefixo /api/system).
 */
@RestController
@RequestMapping("/api/system/integrations/linkedin")
internal class SystemIntegrationsController(
    private val linkedIn: LinkedInService,
) {
    @GetMapping
    fun status(): LinkedInAppResponse = linkedIn.appStatus()

    @PutMapping
    fun save(
        @Valid @RequestBody request: LinkedInCredentialsRequest,
    ): LinkedInAppResponse = linkedIn.saveAppCredentials(request)
}
