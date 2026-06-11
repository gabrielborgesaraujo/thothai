package com.gabrielaraujo.thothai.identity

import com.gabrielaraujo.thothai.shared.TenantContext
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component

/**
 * Garante a existência do administrador do SISTEMA na subida da aplicação, a partir das
 * credenciais em `thothai.admin`. Roda apenas com a base de usuários vazia (instalação nova);
 * o admin também é publicador, no tenant padrão.
 */
@Component
internal class AdminSeeder(
    private val repository: UserAccountRepository,
    private val passwordEncoder: PasswordEncoder,
    private val properties: AdminProperties,
) : ApplicationRunner {
    private val log = LoggerFactory.getLogger(javaClass)

    override fun run(args: ApplicationArguments) {
        if (repository.count() > 0) {
            return
        }
        val username = properties.username.trim().lowercase()
        TenantContext.runAs(TenantContext.DEFAULT_TENANT) {
            repository.save(
                UserAccount(
                    username = username,
                    passwordHash = requireNotNull(passwordEncoder.encode(properties.password)),
                    handle = username,
                    role = UserRole.SYSTEM_ADMIN,
                    status = UserStatus.ACTIVE,
                ),
            )
        }
        log.info("Administrador do sistema '{}' criado (tenant '{}').", username, TenantContext.DEFAULT_TENANT)
    }
}
