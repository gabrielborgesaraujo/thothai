package com.gabrielaraujo.thothai.profile

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.util.UUID

/** Payload de criação/atualização do cartão de identidade (RF07). */
data class ProfileRequest(
    @field:NotBlank
    @field:Size(max = 255)
    val displayName: String,
    @field:Size(max = 255)
    val headline: String?,
    val bio: String?,
    @field:Size(max = 1024)
    val photoUrl: String?,
    @field:Size(max = 512)
    val linkedinUrl: String?,
    @field:Email
    @field:Size(max = 255)
    val email: String?,
)

data class ProfileResponse(
    val id: UUID,
    val displayName: String,
    val headline: String?,
    val bio: String?,
    val photoUrl: String?,
    val linkedinUrl: String?,
    val email: String?,
)

internal fun Profile.toResponse() =
    ProfileResponse(
        id = requireNotNull(id),
        displayName = displayName,
        headline = headline,
        bio = bio,
        photoUrl = photoUrl,
        linkedinUrl = linkedinUrl,
        email = email,
    )
