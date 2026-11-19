package com.syndetis.auth.service

import com.nimbusds.jose.jwk.RSAKey
import com.syndetis.auth.model.entity.User
import com.syndetis.auth.model.enum.Role
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.util.Date

@Service
class JwtService(
    private val rsaKey: RSAKey,
    @Value("\${jwt.expiration:600000}")
    private val expirationMs: Long = 600_000,
    @Value("\${jwt.issuer:http://localhost:8081}")
    val issuer: String = "http://localhost:8081",
    @Value("\${jwt.audience:syndetis}")
    val audience: String = "syndetis",
) {

    val expiresInSeconds: Long get() = expirationMs / 1000

    fun generateToken(user: User): String {
        val now = Date()
        val expiry = Date(now.time + expirationMs)

        val builder = Jwts.builder()
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
        // Merchants carry whether the Receita Federal confirmed their store's CNPJ; the core-service only lets
        // confirmed merchants open stores.
        if (user.role == Role.SELLER) builder.claim("doc_verified", user.documentVerified)
        return builder.signWith(rsaKey.toPrivateKey(), Jwts.SIG.RS256).compact()
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
