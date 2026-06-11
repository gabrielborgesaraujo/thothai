package com.gabrielaraujo.thothai.identity

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

/** Acesso a [UserAccount]. Visível apenas dentro do módulo `identity`. */
internal interface UserAccountRepository : JpaRepository<UserAccount, UUID> {
    fun findByUsername(username: String): UserAccount?

    fun findByHandle(handle: String): UserAccount?

    fun existsByUsername(username: String): Boolean

    fun existsByHandle(handle: String): Boolean

    fun findAllByOrderByCreatedAtDesc(): List<UserAccount>

    fun findAllByStatusAndRoleOrderByCreatedAtDesc(
        status: UserStatus,
        role: UserRole,
    ): List<UserAccount>
}
