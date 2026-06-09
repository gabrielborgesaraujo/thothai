package com.gabrielaraujo.thothai.profile

import com.gabrielaraujo.thothai.shared.ResourceNotFoundException
import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * Regras do cartão de identidade (RF07). Garante um único [Profile] por tenant (RNF03) via upsert.
 */
@Service
@Transactional
internal class ProfileService(
    private val profiles: ProfileRepository,
) {
    @Transactional(readOnly = true)
    fun find(): Profile? = profiles.findByTenantId(TenantContext.currentTenant())

    @Transactional(readOnly = true)
    fun get(): Profile = find() ?: throw ResourceNotFoundException("Perfil não configurado")

    fun upsert(request: ProfileRequest): Profile {
        val profile = find()
        if (profile == null) {
            return profiles.save(
                Profile(
                    displayName = request.displayName,
                    headline = request.headline,
                    bio = request.bio,
                    photoUrl = request.photoUrl,
                    linkedinUrl = request.linkedinUrl,
                    email = request.email,
                ),
            )
        }
        profile.displayName = request.displayName
        profile.headline = request.headline
        profile.bio = request.bio
        profile.photoUrl = request.photoUrl
        profile.linkedinUrl = request.linkedinUrl
        profile.email = request.email
        return profile
    }
}
