package com.seuprojeto.auth.service

import com.nimbusds.jose.jwk.RSAKey
import com.seuprojeto.auth.model.entity.User
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.util.Date

@Service
class JwtService(
    private val rsaKey: RSAKey,
    @Value("\${jwt.expiration:86400000}")
    private val expirationMs: Long = 86_400_000,
    @Value("\${jwt.issuer:http://localhost:8081}")
    val issuer: String = "http://localhost:8081",
    @Value("\${jwt.audience:syndetis}")
    val audience: String = "syndetis"
) {
    fun generateToken(user: User): String {
        val now = Date()
        val expiry = Date(now.time + expirationMs)

        return Jwts.builder()
            .header()
                .keyId(rsaKey.keyID)
                .and()
            .issuer(issuer)
            .audience().single(audience)
            .subject(user.id.toString())
            .claim("email", user.email)
            .claim("role", user.role.name)
            .issuedAt(now)
            .expiration(expiry)
            .signWith(rsaKey.toPrivateKey())
            .compact()
    }

    fun validateToken(token: String): Claims? {
        return try {
            Jwts.parser()
                .verifyWith(rsaKey.toRSAPublicKey())
                .requireIssuer(issuer)
                .requireAudience(audience)
                .build()
                .parseSignedClaims(token)
                .payload
        } catch (e: Exception) {
            null
        }
    }

    fun getUserIdFromToken(token: String): String? {
        return validateToken(token)?.subject
    }
}