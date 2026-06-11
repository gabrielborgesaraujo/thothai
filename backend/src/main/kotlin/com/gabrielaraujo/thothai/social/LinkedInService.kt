package com.gabrielaraujo.thothai.social

import com.gabrielaraujo.thothai.shared.InvalidRequestException
import com.gabrielaraujo.thothai.shared.TenantContext
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.util.UriComponentsBuilder
import java.time.Instant
import java.util.UUID

/**
 * Conexão e publicação no LinkedIn por publicador. As credenciais do APP são macro (plataforma,
 * [LinkedInAppSettings] — geridas pelo admin do sistema); cada publicador autoriza a própria
 * conta via OAuth (escopos openid/profile/w_member_social) e o token fica no tenant dele.
 */
@Service
@Transactional
internal class LinkedInService(
    private val repository: LinkedInConnectionRepository,
    private val appSettings: LinkedInAppSettingsRepository,
    private val api: LinkedInApi,
    private val events: ApplicationEventPublisher,
    @param:Value("\${thothai.public-origin}") private val publicOrigin: String,
) {
    @Transactional(readOnly = true)
    fun status(): LinkedInStatusResponse = toStatus(find())

    /** Monta a URL de autorização OAuth e guarda o `state` anti-CSRF do fluxo. */
    fun authorizeUrl(): String {
        val app = requireConfiguredApp()
        val connection = find() ?: repository.save(LinkedInConnection())
        val state = UUID.randomUUID().toString().replace("-", "")
        connection.oauthState = state
        return UriComponentsBuilder
            .fromUriString("https://www.linkedin.com/oauth/v2/authorization")
            .queryParam("response_type", "code")
            .queryParam("client_id", app.clientId)
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
        val app = requireConfiguredApp()
        val connection = find() ?: throw InvalidRequestException("Conexão LinkedIn não iniciada")
        if (connection.oauthState.isNullOrBlank() || connection.oauthState != state) {
            throw InvalidRequestException("Estado OAuth inválido — recomece a conexão")
        }
        val token =
            api.exchangeCode(
                clientId = requireNotNull(app.clientId),
                clientSecret = requireNotNull(app.clientSecret),
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
        // Marca a postagem de origem como compartilhada (módulo de conteúdo, via evento).
        request.postId?.let { events.publishEvent(LinkedInShareCompleted(it, postId)) }
        return LinkedInShareResponse(postId)
    }

    /** Desfaz a conexão do membro do tenant corrente. */
    fun disconnect(): LinkedInStatusResponse {
        val connection = find() ?: return toStatus(null)
        connection.accessToken = null
        connection.tokenExpiresAt = null
        connection.memberUrn = null
        connection.memberName = null
        connection.oauthState = null
        return toStatus(connection)
    }

    // --- Integração macro (admin do sistema) ---

    @Transactional(readOnly = true)
    fun appStatus(): LinkedInAppResponse = toAppResponse(appSettings.findFirstByOrderByCreatedAtAsc())

    /** Salva as credenciais do app da plataforma (trocar o app NÃO desconecta tokens existentes). */
    fun saveAppCredentials(request: LinkedInCredentialsRequest): LinkedInAppResponse {
        val settings = appSettings.findFirstByOrderByCreatedAtAsc() ?: LinkedInAppSettings()
        settings.clientId = request.clientId.trim()
        settings.clientSecret = request.clientSecret.trim()
        return toAppResponse(appSettings.save(settings))
    }

    private fun requireConfiguredApp(): LinkedInAppSettings =
        appSettings
            .findFirstByOrderByCreatedAtAsc()
            ?.takeIf { !it.clientId.isNullOrBlank() && !it.clientSecret.isNullOrBlank() }
            ?: throw InvalidRequestException(
                "Integração LinkedIn não configurada pelo administrador do sistema",
            )

    private fun find(): LinkedInConnection? = repository.findByTenantId(TenantContext.currentTenant())

    private fun redirectUri(): String = "${publicOrigin.trimEnd('/')}/api/admin/social/linkedin/callback"

    private fun toStatus(connection: LinkedInConnection?): LinkedInStatusResponse {
        val app = appSettings.findFirstByOrderByCreatedAtAsc()
        val configured = !app?.clientId.isNullOrBlank() && !app?.clientSecret.isNullOrBlank()
        val connected =
            !connection?.accessToken.isNullOrBlank() &&
                connection?.tokenExpiresAt?.isAfter(Instant.now()) == true
        return LinkedInStatusResponse(
            configured = configured,
            connected = connected,
            memberName = if (connected) connection?.memberName else null,
            tokenExpiresAt = if (connected) connection?.tokenExpiresAt else null,
        )
    }

    private fun toAppResponse(settings: LinkedInAppSettings?): LinkedInAppResponse =
        LinkedInAppResponse(
            configured = !settings?.clientId.isNullOrBlank() && !settings?.clientSecret.isNullOrBlank(),
            clientIdHint = settings?.clientId?.takeIf { it.isNotBlank() }?.let { "••••${it.takeLast(4)}" },
        )
}
