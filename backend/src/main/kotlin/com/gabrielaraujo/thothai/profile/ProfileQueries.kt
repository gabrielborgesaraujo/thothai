package com.gabrielaraujo.thothai.profile

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * API pública do módulo de perfil para os demais módulos (Spring Modulith).
 * Mantém o repositório interno encapsulado.
 */
@Service
class ProfileQueries internal constructor(
    private val profiles: ProfileRepository,
) {
    /** Nome de exibição do publicador (cartão de identidade), ou nulo se ainda não configurado. */
    @Transactional(readOnly = true)
    fun displayNameForTenant(tenantId: String): String? = profiles.findByTenantId(tenantId)?.displayName
}
