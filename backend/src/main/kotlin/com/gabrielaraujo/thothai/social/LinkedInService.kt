package com.gabrielaraujo.thothai.social

import com.gabrielaraujo.thothai.shared.InvalidRequestException
import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.util.UriComponentsBuilder
import java.time.Instant
import java.util.UUID

/**
 * Conexão e publicação no LinkedIn. O usuário cadastra as credenciais do próprio app
 * (portal de desenvolvedores), autoriza via OAuth (escopos openid/profile/w_member_social)
 * e o token do membro fica guardado para publicar em nome dele.
 */
@Service
@Transactional
internal class LinkedInService(
    private val repository: LinkedInConnectionRepository,
    private val api: LinkedInApi,
    @param:Value("\${thothai.public-origin}") private val publicOrigin: String,
) {
    @Transactional(readOnly = true)
    fun status(): LinkedInStatusResponse = toStatus(find())

    /** Salva as credenciais do app; troca de app invalida o token anterior. */
    fun saveCredentials(request: LinkedInCredentialsRequest): LinkedInStatusResponse {
        val connection = find() ?: LinkedInConnection()
        connection.clientId = request.clientId.trim()
        connection.clientSecret = request.clientSecret.trim()
        connection.accessToken = null
        connection.tokenExpiresAt = null
        connection.memberUrn = null
        connection.memberName = null
        connection.oauthState = null
        return toStatus(repository.save(connection))
    }

    /** Monta a URL de autorização OAuth e guarda o `state` anti-CSRF do fluxo. */
    fun authorizeUrl(): String {
        val connection =
            find()?.takeIf { !it.clientId.isNullOrBlank() && !it.clientSecret.isNullOrBlank() }
                ?: throw InvalidRequestException("Cadastre o Client ID e o Client Secret do app LinkedIn primeiro")
        val state = UUID.randomUUID().toString().replace("-", "")
        connection.oauthState = state
        return UriComponentsBuilder
            .fromUriString("https://www.linkedin.com/oauth/v2/authorization")
            .queryParam("response_type", "code")
            .queryParam("client_id", connection.clientId)
            .queryParam("redirect_uri", redirectUri())
            .queryParam("state", state)
            .queryParam("scope", "openid profile w_member_social")
            .build()
            .encode()
            .toUriString()
    }

    /** Callback do OAuth: valida o state, troca o código por token e guarda a identidade. */
    fun handleCallback(
        code: String,
        state: String,
    ) {
        val connection = find() ?: throw InvalidRequestException("Conexão LinkedIn não configurada")
        if (connection.oauthState.isNullOrBlank() || connection.oauthState != state) {
            throw InvalidRequestException("Estado OAuth inválido — recomece a conexão")
        }
        val token =
            api.exchangeCode(
                clientId = requireNotNull(connection.clientId),
                clientSecret = requireNotNull(connection.clientSecret),
                code = code,
                redirectUri = redirectUri(),
            )
        val member = api.fetchMember(token.accessToken)
        connection.accessToken = token.accessToken
        connection.tokenExpiresAt = Instant.now().plusSeconds(token.expiresInSeconds)
        connection.memberUrn = "urn:li:person:${member.id}"
        connection.memberName = member.name
        connection.oauthState = null
    }

    /** Publica no feed do membro conectado; retorna o URN do post no LinkedIn. */
    fun share(request: LinkedInShareRequest): LinkedInShareResponse {
        val text = request.text.trim()
        if (text.isBlank()) {
            throw InvalidRequestException("Informe o texto da publicação")
        }
        val connection = find()
        val token = connection?.accessToken
        val member = connection?.memberUrn
        if (connection == null || token.isNullOrBlank() || member.isNullOrBlank()) {
            throw InvalidRequestException("Conecte sua conta do LinkedIn em Integrações")
        }
        if (connection.tokenExpiresAt?.isBefore(Instant.now()) == true) {
            throw InvalidRequestException("A conexão com o LinkedIn expirou — reconecte em Integrações")
        }
        val postId = api.share(token, member, text, request.url?.trim()?.ifBlank { null })
        return LinkedInShareResponse(postId)
    }

    /** Desfaz a conexão do membro (mantém as credenciais do app). */
    fun disconnect(): LinkedInStatusResponse {
        val connection = find() ?: return toStatus(null)
        connection.accessToken = null
        connection.tokenExpiresAt = null
        connection.memberUrn = null
        connection.memberName = null
        connection.oauthState = null
        return toStatus(connection)
    }

    private fun find(): LinkedInConnection? = repository.findByTenantId(TenantContext.currentTenant())

    private fun redirectUri(): String = "${publicOrigin.trimEnd('/')}/api/admin/social/linkedin/callback"

    private fun toStatus(connection: LinkedInConnection?): LinkedInStatusResponse {
        val configured = !connection?.clientId.isNullOrBlank() && !connection?.clientSecret.isNullOrBlank()
        val connected =
            !connection?.accessToken.isNullOrBlank() &&
                connection?.tokenExpiresAt?.isAfter(Instant.now()) == true
        return LinkedInStatusResponse(
            configured = configured,
            connected = connected,
            memberName = if (connected) connection?.memberName else null,
            tokenExpiresAt = if (connected) connection?.tokenExpiresAt else null,
            clientIdHint = connection?.clientId?.takeIf { it.isNotBlank() }?.let { "••••${it.takeLast(4)}" },
        )
    }
}
