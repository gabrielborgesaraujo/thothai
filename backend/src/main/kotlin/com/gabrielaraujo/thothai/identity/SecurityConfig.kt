package com.gabrielaraujo.thothai.identity

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.ProviderManager
import org.springframework.security.authentication.dao.DaoAuthenticationProvider
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.core.userdetails.UserDetailsService
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.HttpStatusEntryPoint
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler
import org.springframework.security.web.context.HttpSessionSecurityContextRepository
import org.springframework.security.web.context.SecurityContextRepository
import org.springframework.security.web.csrf.CookieCsrfTokenRepository
import org.springframework.security.web.csrf.CsrfToken
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import org.springframework.web.filter.OncePerRequestFilter
import java.util.function.Supplier

/**
 * Autenticação por sessão + cookie HttpOnly para o admin (RF01).
 *
 * - Rotas GET de leitura pública (posts, profile, portfolio) liberadas.
 * - Rotas administrativas exigem o papel ADMIN.
 * - CSRF protegido via cookie XSRF-TOKEN (padrão SPA) — o Angular reenvia em X-XSRF-TOKEN.
 * - CORS restrito à origem do frontend, com credenciais habilitadas.
 */
@Configuration
@EnableWebSecurity
@EnableConfigurationProperties(AdminProperties::class, CorsProperties::class)
class SecurityConfig {
    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun authenticationManager(
        userDetailsService: UserDetailsService,
        passwordEncoder: PasswordEncoder,
    ): AuthenticationManager {
        val provider = DaoAuthenticationProvider(userDetailsService)
        provider.setPasswordEncoder(passwordEncoder)
        return ProviderManager(provider)
    }

    @Bean
    fun securityContextRepository(): SecurityContextRepository = HttpSessionSecurityContextRepository()

    @Bean
    fun corsConfigurationSource(properties: CorsProperties): CorsConfigurationSource {
        val config =
            CorsConfiguration().apply {
                allowedOrigins = properties.allowedOrigins.split(",").map { it.trim() }
                allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
                allowedHeaders = listOf("*")
                allowCredentials = true
            }
        return UrlBasedCorsConfigurationSource().apply { registerCorsConfiguration("/**", config) }
    }

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .cors {}
            .csrf { csrf ->
                csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                csrf.csrfTokenRequestHandler(SpaCsrfTokenRequestHandler())
            }.authorizeHttpRequests { auth ->
                auth.requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                auth.requestMatchers(HttpMethod.GET, "/api/posts/**").permitAll()
                auth.requestMatchers(HttpMethod.GET, "/api/profile", "/api/portfolio/**").permitAll()
                auth.requestMatchers("/actuator/health").permitAll()
                auth.requestMatchers("/api/admin/**").hasRole("ADMIN")
                auth.requestMatchers("/api/auth/me", "/api/auth/logout").authenticated()
                auth.anyRequest().permitAll()
            }.sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED) }
            .exceptionHandling { it.authenticationEntryPoint(HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)) }
            .formLogin { it.disable() }
            .httpBasic { it.disable() }
            .logout { logout ->
                logout
                    .logoutUrl("/api/auth/logout")
                    .logoutSuccessHandler(HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT))
            }.addFilterAfter(CsrfCookieFilter(), org.springframework.security.web.csrf.CsrfFilter::class.java)
        return http.build()
    }
}

/**
 * Padrão SPA do Spring Security: aceita o token CSRF cru (enviado pelo Angular em `X-XSRF-TOKEN`)
 * e usa o handler XOR para renderizar o token na resposta.
 */
private class SpaCsrfTokenRequestHandler : CsrfTokenRequestAttributeHandler() {
    private val delegate = XorCsrfTokenRequestAttributeHandler()

    override fun handle(
        request: HttpServletRequest,
        response: HttpServletResponse,
        csrfToken: Supplier<CsrfToken>,
    ) = delegate.handle(request, response, csrfToken)

    override fun resolveCsrfTokenValue(
        request: HttpServletRequest,
        csrfToken: CsrfToken,
    ): String? =
        if (request.getHeader(csrfToken.headerName) != null) {
            super.resolveCsrfTokenValue(request, csrfToken)
        } else {
            delegate.resolveCsrfTokenValue(request, csrfToken)
        }
}

/** Força a materialização do token CSRF a cada requisição, garantindo o envio do cookie `XSRF-TOKEN`. */
private class CsrfCookieFilter : OncePerRequestFilter() {
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        (request.getAttribute(CsrfToken::class.java.name) as? CsrfToken)?.token
        filterChain.doFilter(request, response)
    }
}
