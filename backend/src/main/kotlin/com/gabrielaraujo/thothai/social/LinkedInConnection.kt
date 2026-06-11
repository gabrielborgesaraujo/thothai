package com.gabrielaraujo.thothai.social

import com.gabrielaraujo.thothai.shared.AbstractTenantEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.time.Instant

/**
 * Conexão do LinkedIn do publicador: o token OAuth do membro (validade ~60 dias) usado para
 * publicar em nome dele. As credenciais do APP são da plataforma ([LinkedInAppSettings],
 * geridas pelo administrador do sistema). Segredos nunca saem inteiros pela API.
 */
@Entity
@Table(name = "linkedin_connections")
class LinkedInConnection(
    @Column(name = "access_token", length = 2048)
    var accessToken: String? = null,
    @Column(name = "token_expires_at")
    var tokenExpiresAt: Instant? = null,
    /** URN do membro (urn:li:person:…), autor das publicações. */
    @Column(name = "member_urn", length = 128)
    var memberUrn: String? = null,
    @Column(name = "member_name", length = 255)
    var memberName: String? = null,
    /** Estado anti-CSRF do fluxo OAuth em andamento. */
    @Column(name = "oauth_state", length = 64)
    var oauthState: String? = null,
) : AbstractTenantEntity()
