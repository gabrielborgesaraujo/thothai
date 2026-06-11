package com.gabrielaraujo.thothai.social

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.web.client.RestClient
import java.time.Duration

/** [RestClient] das integrações sociais, com timeouts para não travar o painel (RNF02). */
@Configuration
internal class SocialConfig {
    @Bean
    fun socialRestClient(): RestClient {
        val factory =
            SimpleClientHttpRequestFactory().apply {
                setConnectTimeout(Duration.ofSeconds(5))
                setReadTimeout(Duration.ofSeconds(20))
            }
        return RestClient
            .builder()
            .requestFactory(factory)
            .build()
    }
}
