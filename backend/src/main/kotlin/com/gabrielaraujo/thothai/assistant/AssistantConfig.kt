package com.gabrielaraujo.thothai.assistant

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.web.client.RestClient
import java.time.Duration

/**
 * Beans da integração de IA, todos com timeout configurado (RNF02):
 * - [tavilyRestClient]: busca viva (Tavily);
 * - [aiRestClient]: chamadas de chat OpenAI-compatíveis (a base URL varia por provedor e é
 *   informada por requisição). O cliente Anthropic é construído por chave dentro do
 *   [AnthropicChatClient], pois chave/provedor podem ser trocados em runtime pelo painel.
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

    @Bean
    fun aiRestClient(properties: AiProperties): RestClient {
        val factory =
            SimpleClientHttpRequestFactory().apply {
                setConnectTimeout(Duration.ofSeconds(5))
                setReadTimeout(properties.timeout)
            }
        return RestClient
            .builder()
            .requestFactory(factory)
            .build()
    }
}
