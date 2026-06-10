package com.gabrielaraujo.thothai.assistant

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.web.client.RestClient
import java.time.Duration

/**
 * Beans da integração de IA: [RestClient] do Tavily com timeout configurado (RNF02).
 * O cliente Anthropic é construído por chave dentro do [ClaudeLlmClient], pois a chave pode
 * ser trocada em runtime pelo painel ([AiSettingsService]).
 */
@Configuration
@EnableConfigurationProperties(AiProperties::class, SearchProperties::class)
internal class AssistantConfig {
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
