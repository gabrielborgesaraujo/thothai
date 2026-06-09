package com.gabrielaraujo.thothai.assistant

import com.anthropic.client.AnthropicClient
import com.anthropic.client.okhttp.AnthropicOkHttpClient
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.web.client.RestClient
import java.time.Duration

/**
 * Beans da integração de IA: cliente Anthropic (Claude) e [RestClient] do Tavily, ambos com timeout
 * configurado (RNF02). A chave em branco recebe um placeholder — o [ClaudeLlmClient] verifica a chave
 * real antes de chamar, então o cliente placeholder nunca é usado de fato.
 */
@Configuration
@EnableConfigurationProperties(AiProperties::class, SearchProperties::class)
internal class AssistantConfig {
    @Bean
    fun anthropicClient(properties: AiProperties): AnthropicClient =
        AnthropicOkHttpClient
            .builder()
            .apiKey(properties.claude.apiKey.ifBlank { "not-configured" })
            .baseUrl(properties.claude.baseUrl)
            .timeout(properties.timeout)
            .build()

    @Bean
    fun tavilyRestClient(properties: SearchProperties): RestClient {
        val factory =
            SimpleClientHttpRequestFactory().apply {
                setConnectTimeout(Duration.ofSeconds(5))
                setReadTimeout(properties.timeout)
            }
        return RestClient
            .builder()
            .baseUrl(properties.tavily.baseUrl)
            .requestFactory(factory)
            .build()
    }
}
