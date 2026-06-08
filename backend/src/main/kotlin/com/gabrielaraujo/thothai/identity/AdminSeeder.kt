package com.gabrielaraujo.thothai.identity

import com.gabrielaraujo.thothai.shared.TenantContext
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component

/**
 * Garante a existência do administrador único do tenant padrão na subida da aplicação (RF01),
 * a partir das credenciais em `thothai.admin`. Não sobrescreve um admin já existente.
 */
@Component
internal class AdminSeeder(
    private val repository: AdminUserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val properties: AdminProperties,
) : ApplicationRunner {
    private val log = LoggerFactory.getLogger(javaClass)

    override fun run(args: ApplicationArguments) {
        val tenant = TenantContext.DEFAULT_TENANT
        if (repository.existsByTenantId(tenant)) {
            return
        }
        repository.save(
            AdminUser(
                username = properties.username,
                passwordHash = requireNotNull(passwordEncoder.encode(properties.password)),
            ),
        )
        log.info("Administrador inicial '{}' criado para o tenant '{}'.", properties.username, tenant)
    }
}
