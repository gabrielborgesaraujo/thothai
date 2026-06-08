package com.gabrielaraujo.thothai.shared

import org.springframework.context.annotation.Configuration
import org.springframework.data.jpa.repository.config.EnableJpaAuditing

/** Habilita o preenchimento automático de `createdAt`/`updatedAt` em [AbstractTenantEntity]. */
@Configuration
@EnableJpaAuditing
class JpaAuditingConfig
