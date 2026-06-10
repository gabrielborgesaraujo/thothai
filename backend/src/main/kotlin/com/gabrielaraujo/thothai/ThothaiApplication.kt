package com.gabrielaraujo.thothai

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.modulith.Modulithic
import org.springframework.scheduling.annotation.EnableScheduling

// Agendamento habilitado para jobs periódicos (ex.: publicação agendada de posts).
@EnableScheduling
@Modulithic(systemName = "ThothAI", sharedModules = ["shared"])
@SpringBootApplication
class ThothaiApplication

fun main(args: Array<String>) {
    runApplication<ThothaiApplication>(*args)
}
