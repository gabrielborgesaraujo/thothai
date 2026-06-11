package com.gabrielaraujo.thothai.social

import jakarta.validation.Valid
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * Conexão e publicação no LinkedIn (ROLE_ADMIN — prefixo /api/admin). O callback OAuth chega
 * pelo navegador do admin (sessão ativa) e redireciona de volta para a tela de Integrações.
 */
@RestController
@RequestMapping("/api/admin/social/linkedin")
internal class LinkedInController(
    private val linkedIn: LinkedInService,
) {
    @GetMapping
    fun status(): LinkedInStatusResponse = linkedIn.status()

    /** URL de autorização OAuth — o frontend redireciona o navegador para ela. */
    @GetMapping("/authorize-url")
    fun authorizeUrl(): Map<String, String> = mapOf("url" to linkedIn.authorizeUrl())

    @GetMapping("/callback")
    fun callback(
        @RequestParam(required = false) code: String?,
        @RequestParam(required = false) state: String?,
        @RequestParam(required = false) error: String?,
    ): ResponseEntity<Void> {
        val result =
            if (error != null || code.isNullOrBlank() || state.isNullOrBlank()) {
                "error"
            } else {
                runCatching { linkedIn.handleCallback(code, state) }
                    .fold(onSuccess = { "connected" }, onFailure = { "error" })
            }
        return ResponseEntity
            .status(HttpStatus.FOUND)
            .header(HttpHeaders.LOCATION, "/admin/integrations?linkedin=$result")
            .build()
    }

    @PostMapping("/share")
    fun share(
        @Valid @RequestBody request: LinkedInShareRequest,
    ): LinkedInShareResponse = linkedIn.share(request)

    @DeleteMapping
    fun disconnect(): LinkedInStatusResponse = linkedIn.disconnect()
}
