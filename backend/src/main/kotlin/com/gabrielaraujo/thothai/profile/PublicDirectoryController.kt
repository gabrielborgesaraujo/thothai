package com.gabrielaraujo.thothai.profile

import com.gabrielaraujo.thothai.identity.IdentityQueries
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

/** Publicador no diretório da plataforma (landing). */
data class PublisherCardResponse(
    val handle: String,
    val displayName: String,
    val headline: String?,
    val photoUrl: String?,
)

/**
 * Diretório público de publicadores ativos (Fase 2): identidade vinda do módulo identity,
 * cartão (nome/foto) vindo do perfil de cada tenant.
 */
@RestController
internal class PublicDirectoryController(
    private val identity: IdentityQueries,
    private val profiles: ProfileRepository,
) {
    @GetMapping("/api/publishers")
    fun publishers(): List<PublisherCardResponse> {
        val active = identity.activePublishers()
        val profilesByTenant =
            profiles.findAllByTenantIdIn(active.map { it.tenantId }).associateBy { it.tenantId }
        return active.map { publisher ->
            val profile = profilesByTenant[publisher.tenantId]
            PublisherCardResponse(
                handle = publisher.handle,
                displayName = profile?.displayName ?: publisher.handle,
                headline = profile?.headline,
                photoUrl = profile?.photoUrl,
            )
        }
    }
}
