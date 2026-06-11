package com.gabrielaraujo.thothai.social

import com.fasterxml.jackson.annotation.JsonProperty
import com.gabrielaraujo.thothai.shared.ExternalServiceException
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestClient
import org.springframework.web.client.body

/** Resultado da troca do código OAuth por um token de acesso. */
internal data class LinkedInToken(
    val accessToken: String,
    val expiresInSeconds: Long,
)

/** Identidade do membro autenticado (OpenID Connect). */
internal data class LinkedInMember(
    val id: String,
    val name: String?,
)

/**
 * Chamadas HTTP ao LinkedIn, atrás de interface para os testes não dependerem do serviço real.
 * Falhas de comunicação viram [ExternalServiceException] (RNF02).
 */
internal interface LinkedInApi {
    fun exchangeCode(
        clientId: String,
        clientSecret: String,
        code: String,
        redirectUri: String,
    ): LinkedInToken

    fun fetchMember(accessToken: String): LinkedInMember

    /** Publica o conteúdo e retorna o URN/id do post criado. */
    fun share(
        accessToken: String,
        memberUrn: String,
        text: String,
        articleUrl: String?,
    ): String
}

@Component
internal class RestLinkedInApi(
    @param:Qualifier("socialRestClient")
    private val restClient: RestClient,
) : LinkedInApi {
    override fun exchangeCode(
        clientId: String,
        clientSecret: String,
        code: String,
        redirectUri: String,
    ): LinkedInToken {
        val form = LinkedMultiValueMap<String, String>()
        form.add("grant_type", "authorization_code")
        form.add("code", code)
        form.add("client_id", clientId)
        form.add("client_secret", clientSecret)
        form.add("redirect_uri", redirectUri)
        return try {
            val response =
                restClient
                    .post()
                    .uri("https://www.linkedin.com/oauth/v2/accessToken")
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body<TokenResponse>()
            val token = response?.accessToken
            if (token.isNullOrBlank()) {
                throw IllegalStateException("Token ausente na resposta do LinkedIn")
            }
            LinkedInToken(token, response.expiresIn ?: DEFAULT_TOKEN_TTL_SECONDS)
        } catch (ex: Exception) {
            throw ExternalServiceException("Falha ao trocar o código OAuth com o LinkedIn", ex)
        }
    }

    override fun fetchMember(accessToken: String): LinkedInMember =
        try {
            val info =
                restClient
                    .get()
                    .uri("https://api.linkedin.com/v2/userinfo")
                    .header("Authorization", "Bearer $accessToken")
                    .retrieve()
                    .body<UserInfoResponse>()
            val id = info?.sub
            if (id.isNullOrBlank()) {
                throw IllegalStateException("Identidade ausente na resposta do LinkedIn")
            }
            LinkedInMember(id, info.name)
        } catch (ex: Exception) {
            throw ExternalServiceException("Falha ao consultar a identidade no LinkedIn", ex)
        }

    override fun share(
        accessToken: String,
        memberUrn: String,
        text: String,
        articleUrl: String?,
    ): String {
        val shareContent =
            buildMap<String, Any> {
                put("shareCommentary", mapOf("text" to text))
                if (articleUrl != null) {
                    put("shareMediaCategory", "ARTICLE")
                    put("media", listOf(mapOf("status" to "READY", "originalUrl" to articleUrl)))
                } else {
                    put("shareMediaCategory", "NONE")
                }
            }
        val payload =
            mapOf(
                "author" to memberUrn,
                "lifecycleState" to "PUBLISHED",
                "specificContent" to mapOf("com.linkedin.ugc.ShareContent" to shareContent),
                "visibility" to mapOf("com.linkedin.ugc.MemberNetworkVisibility" to "PUBLIC"),
            )
        return try {
            val response =
                restClient
                    .post()
                    .uri("https://api.linkedin.com/v2/ugcPosts")
                    .header("Authorization", "Bearer $accessToken")
                    .header("X-Restli-Protocol-Version", "2.0.0")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body<UgcPostResponse>()
            response?.id ?: throw IllegalStateException("Id ausente na resposta do LinkedIn")
        } catch (ex: Exception) {
            throw ExternalServiceException("Falha ao publicar no LinkedIn", ex)
        }
    }

    private companion object {
        const val DEFAULT_TOKEN_TTL_SECONDS = 60L * 60 * 24 * 60
    }
}

internal data class TokenResponse(
    @param:JsonProperty("access_token")
    val accessToken: String? = null,
    @param:JsonProperty("expires_in")
    val expiresIn: Long? = null,
)

internal data class UserInfoResponse(
    val sub: String? = null,
    val name: String? = null,
)

internal data class UgcPostResponse(
    val id: String? = null,
)
