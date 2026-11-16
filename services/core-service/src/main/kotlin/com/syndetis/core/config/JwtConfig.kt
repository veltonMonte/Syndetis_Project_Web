package com.syndetis.core.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator
import org.springframework.security.oauth2.core.OAuth2Error
import org.springframework.security.oauth2.core.OAuth2TokenValidator
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.JwtValidators
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import java.util.UUID

@Configuration
class JwtConfig(
    @Value("\${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") private val jwksUri: String,
    @Value("\${core.jwt.issuer}") private val issuer: String,
    @Value("\${core.jwt.audience}") private val audience: String,
) {
    @Bean
    fun jwtDecoder(): JwtDecoder = NimbusJwtDecoder.withJwkSetUri(jwksUri)
        .jwsAlgorithm(SignatureAlgorithm.RS256)
        .build()
        .also { decoder ->
            decoder.setJwtValidator(
                DelegatingOAuth2TokenValidator(
                    JwtValidators.createDefaultWithIssuer(issuer),
                    OAuth2TokenValidator<Jwt> { jwt -> validateClaims(jwt) },
                ),
            )
        }

    private fun validateClaims(jwt: Jwt): OAuth2TokenValidatorResult {
        val validSubject = runCatching { UUID.fromString(jwt.subject) }.isSuccess
        val validRole = jwt.getClaimAsString("role") in VALID_ROLES
        if (jwt.audience?.contains(audience) == true && validSubject && validRole) {
            return OAuth2TokenValidatorResult.success()
        }
        return OAuth2TokenValidatorResult.failure(OAuth2Error("invalid_token", "Claims do token inválidas", null))
    }

    private companion object {
        val VALID_ROLES = setOf("CUSTOMER", "SELLER", "ADMIN")
    }
}
