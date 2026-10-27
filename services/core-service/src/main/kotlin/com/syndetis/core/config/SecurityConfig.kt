package com.syndetis.core.config

import org.springframework.context.annotation.Bean
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.authentication.AbstractAuthenticationToken
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.security.web.SecurityFilterChain
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import org.springframework.core.convert.converter.Converter

@Configuration
class SecurityConfig(
    @Value("\${core.cors.allowed-origins:http://localhost:5173,http://localhost:8080}") private val allowedOrigins: List<String>,
) {
    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain = http
        .csrf { it.disable() }
        .cors { }
        .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
        .authorizeHttpRequests { requests ->
            requests
                .requestMatchers(HttpMethod.GET, "/api/public/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/internal/payments/notifications").permitAll()
                .requestMatchers(HttpMethod.POST, "/internal/billing/notifications").permitAll()
                .requestMatchers("/actuator/health", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/api/stores/**").hasAnyRole("SELLER", "ADMIN")
                .requestMatchers("/api/customers/**", "/api/orders/**").hasAnyRole("CUSTOMER", "SELLER", "ADMIN")
                .anyRequest().denyAll()
        }
        .oauth2ResourceServer { resourceServer ->
            resourceServer.jwt { jwt -> jwt.jwtAuthenticationConverter(roleConverter()) }
        }
        .build()

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource =
        UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/**", CorsConfiguration().apply {
                allowedOrigins = this@SecurityConfig.allowedOrigins
                allowedMethods = listOf("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                allowedHeaders = listOf("Authorization", "Content-Type", "Idempotency-Key", "If-Match")
                exposedHeaders = listOf("ETag")
            })
        }

    private fun roleConverter(): Converter<Jwt, AbstractAuthenticationToken> = Converter { jwt ->
        val authority = SimpleGrantedAuthority("ROLE_${jwt.getClaimAsString("role")}")
        JwtAuthenticationToken(jwt, listOf(authority), jwt.subject ?: "")
    }
}
