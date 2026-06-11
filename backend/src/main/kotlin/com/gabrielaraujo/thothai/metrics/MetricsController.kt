package com.gabrielaraujo.thothai.metrics

import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/**
 * Métricas de acesso/leitura: o beacon é público (chamado pelo portal) e isento de CSRF no
 * SecurityConfig — só incrementa contadores agregados, sem dados do leitor. O resumo fica
 * sob /api/admin (ROLE_ADMIN).
 */
@RestController
internal class MetricsController(
    private val metricsService: MetricsService,
) {
    @PostMapping("/api/metrics/views")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun record(
        @Valid @RequestBody request: ViewRequest,
        @RequestHeader(value = "User-Agent", required = false) userAgent: String?,
    ) = metricsService.record(request.path, request.metric, request.referrer, userAgent)

    @GetMapping("/api/admin/metrics/summary")
    fun summary(): MetricsSummaryResponse = metricsService.summary()
}
