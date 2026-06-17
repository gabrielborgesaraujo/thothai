package com.gabrielaraujo.thothai.identity

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

/** Acesso aos tokens de vínculo com o LinkedIn. Visível apenas dentro do módulo `identity`. */
internal interface LinkedInLinkTokenRepository : JpaRepository<LinkedInLinkToken, UUID> {
    fun findByTokenHash(tokenHash: String): LinkedInLinkToken?
}
