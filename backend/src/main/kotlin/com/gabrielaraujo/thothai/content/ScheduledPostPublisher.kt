package com.gabrielaraujo.thothai.content

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

/**
 * Job que promove a PUBLISHED os posts agendados cujo horário venceu. Roda a cada minuto —
 * granularidade suficiente para agendamento editorial.
 */
@Component
internal class ScheduledPostPublisher(
    private val postService: PostService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Scheduled(fixedDelayString = "PT1M")
    fun publishDue() {
        val published = postService.publishDueScheduled()
        if (published > 0) {
            log.info("Publicados {} post(s) agendado(s)", published)
        }
    }
}
