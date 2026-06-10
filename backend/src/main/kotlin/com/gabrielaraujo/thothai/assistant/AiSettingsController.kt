package com.gabrielaraujo.thothai.assistant

import jakarta.validation.Valid
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * Configuração das integrações de IA pelo próprio usuário (chaves de API).
 * Protegido por ROLE_ADMIN (prefixo /api/admin). As chaves nunca retornam inteiras.
 */
@RestController
@RequestMapping("/api/admin/assistant/settings")
internal class AiSettingsController(
    private val settings: AiSettingsService,
) {
    @GetMapping
    fun get(): AiSettingsResponse = settings.get()

    @PutMapping
    fun update(
        @Valid @RequestBody request: AiSettingsRequest,
    ): AiSettingsResponse = settings.update(request)
}
