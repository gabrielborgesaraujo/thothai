package com.gabrielaraujo.thothai.identity

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

internal interface PasswordResetTokenRepository : JpaRepository<PasswordResetToken, UUID> {
    fun findByTokenHash(tokenHash: String): PasswordResetToken?
}
