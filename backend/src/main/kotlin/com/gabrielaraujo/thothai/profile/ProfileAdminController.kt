package com.gabrielaraujo.thothai.profile

import jakarta.validation.Valid
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * Gestão do cartão de identidade no painel (RF07). Protegido por ROLE_ADMIN no SecurityConfig
 * (prefixo /api/admin). O GET retorna 404 enquanto o perfil não foi configurado.
 */
@RestController
@RequestMapping("/api/admin/profile")
internal class ProfileAdminController(
    private val profileService: ProfileService,
) {
    @GetMapping
    fun get(): ProfileResponse = profileService.get().toResponse()

    @PutMapping
    fun upsert(
        @Valid @RequestBody request: ProfileRequest,
    ): ProfileResponse = profileService.upsert(request).toResponse()
}
