package com.gabrielaraujo.thothai.social

import com.fasterxml.jackson.annotation.JsonProperty
import com.gabrielaraujo.thothai.shared.ExternalServiceException
import org.slf4j.LoggerFactory
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
    val email: String? = null,
    val emailVerified: Boolean = false,
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
    private val log = LoggerFactory.getLogger(javaClass)

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
            LinkedInMember(id, info.name, info.email?.lowercase()?.trim(), info.emailVerified ?: false)
        } catch (ex: Exception) {
            throw ExternalServiceException("Falha ao consultar a identidade no LinkedIn", ex)
        }

    /**
     * Publica via **Posts API** atual (`/rest/posts`), que substitui o legado `/v2/ugcPosts`.
     * Exige os headers `LinkedIn-Version` e `X-Restli-Protocol-Version`. Quando há link, ele é
     * anexado ao texto (o LinkedIn gera o cartão de pré-visualização a partir da URL no comentário).
     * O id do post criado volta no header `x-restli-id` (201), não no corpo. Em erro, o status e o
     * corpo do LinkedIn são logados e propagados — diagnóstico que faltava no fluxo antigo.
     */
    override fun share(
        accessToken: String,
        memberUrn: String,
        text: String,
        articleUrl: String?,
    ): String {
        val commentary =
            if (articleUrl != null && !text.contains(articleUrl)) "$text\n\n$articleUrl" else text
        val payload =
            mapOf(
                "author" to memberUrn,
                "commentary" to commentary,
                "visibility" to "PUBLIC",
                "distribution" to
                    mapOf(
                        "feedDistribution" to "MAIN_FEED",
                        "targetEntities" to emptyList<Any>(),
                        "thirdPartyDistributionChannels" to emptyList<Any>(),
                    ),
                "lifecycleState" to "PUBLISHED",
                "isReshareDisabledByAuthor" to false,
            )
        return try {
            restClient
                .post()
                .uri("https://api.linkedin.com/rest/posts")
                .header("Authorization", "Bearer $accessToken")
                .header("LinkedIn-Version", LINKEDIN_API_VERSION)
                .header("X-Restli-Protocol-Version", "2.0.0")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .exchange { _, response ->
                    if (response.statusCode.is2xxSuccessful) {
                        response.headers.getFirst("x-restli-id")
                            ?: throw IllegalStateException("Id ausente na resposta do LinkedIn")
                    } else {
                        val body = runCatching { response.bodyTo(String::class.java) }.getOrNull()
                        log.error("Publicação no LinkedIn falhou: status={} body={}", response.statusCode, body)
                        throw ExternalServiceException(
                            "LinkedIn recusou a publicação (HTTP ${response.statusCode.value()})" +
                                (body?.takeIf { it.isNotBlank() }?.let { ": ${it.take(300)}" } ?: ""),
                        )
                    }
                }
        } catch (ex: ExternalServiceException) {
            throw ex
        } catch (ex: Exception) {
            log.error("Falha de comunicação ao publicar no LinkedIn", ex)
            throw ExternalServiceException("Falha ao publicar no LinkedIn: ${ex.message}", ex)
        }
    }

    private companion object {
        const val DEFAULT_TOKEN_TTL_SECONDS = 60L * 60 * 24 * 60

        /** Versão da API do LinkedIn (mensal, AAAAMM) exigida nos headers da Posts API. */
        const val LINKEDIN_API_VERSION = "202505"
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
    val email: String? = null,
    @param:JsonProperty("email_verified")
    val emailVerified: Boolean? = null,
)
