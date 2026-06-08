package com.gabrielaraujo.thothai

import org.junit.jupiter.api.Test
import org.springframework.modulith.core.ApplicationModules

/**
 * Verifica as regras de arquitetura do Spring Modulith: ausência de dependências cíclicas e
 * respeito ao encapsulamento entre módulos de domínio. O build falha em caso de violação.
 */
class ModulithArchitectureTests {
    private val modules = ApplicationModules.of(ThothaiApplication::class.java)

    @Test
    fun verifiesModularStructure() {
        modules.verify()
    }
}
