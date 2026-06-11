package com.gabrielaraujo.thothai.identity

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/** Publicador ativo, na visão dos outros módulos (diretório, feeds, métricas). */
data class PublisherRef(
    val tenantId: String,
    val handle: String,
)

/**
 * API pública do módulo de identidade para os demais módulos (Spring Modulith).
 * Mantém o repositório de usuários encapsulado.
 */
@Service
class IdentityQueries internal constructor(
    private val users: UserAccountRepository,
) {
    /** Tenant do publicador ATIVO dono do handle, ou nulo. */
    @Transactional(readOnly = true)
    fun tenantForHandle(handle: String): String? = users.findByHandle(handle)?.takeIf { it.status == UserStatus.ACTIVE }?.tenantId

    /** Todos os publicadores ativos (inclui o admin do sistema, que também publica). */
    @Transactional(readOnly = true)
    fun activePublishers(): List<PublisherRef> =
        users
            .findAllByOrderByCreatedAtDesc()
            .filter { it.status == UserStatus.ACTIVE }
            .map { PublisherRef(tenantId = it.tenantId, handle = it.handle) }
}
