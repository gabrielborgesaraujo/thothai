package com.gabrielaraujo.thothai

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.modulith.Modulithic

@Modulithic(systemName = "ThothAI", sharedModules = ["shared"])
@SpringBootApplication
class ThothaiApplication

fun main(args: Array<String>) {
    runApplication<ThothaiApplication>(*args)
}
