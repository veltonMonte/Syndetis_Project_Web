package com.syndetis.core.config

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.RSASSASigner
import com.nimbusds.jose.jwk.JWKSet
import com.nimbusds.jose.jwk.RSAKey
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import com.sun.net.httpserver.HttpServer
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.security.oauth2.jwt.JwtException
import java.net.InetSocketAddress
import java.security.KeyPairGenerator
import java.security.interfaces.RSAPrivateKey
import java.security.interfaces.RSAPublicKey
import java.util.Date
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class JwtConfigTest {
    private lateinit var server: HttpServer
    private lateinit var key: RSAKey

    @BeforeEach
    fun startJwks() {
        val pair = KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair()
        key = RSAKey.Builder(pair.public as RSAPublicKey)
            .privateKey(pair.private as RSAPrivateKey)
            .keyID("test-key")
            .build()
        val jwks = JWKSet(key.toPublicJWK()).toString().toByteArray()
        server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0).apply {
            createContext("/keys") { exchange ->
                exchange.responseHeaders.add("Content-Type", "application/json")
                exchange.sendResponseHeaders(200, jwks.size.toLong())
                exchange.responseBody.use { it.write(jwks) }
            }
            start()
        }
    }

    @AfterEach
    fun stopJwks() = server.stop(0)

    @Test
    fun `accepts an auth token signed with the public JWKS key`() {
        val subject = UUID.randomUUID().toString()
        val decoded = decoder().decode(token(subject = subject))
        assertEquals(subject, decoded.subject)
        assertEquals("SELLER", decoded.getClaimAsString("role"))
    }

    @Test
    fun `rejects a different issuer or audience`() {
        assertFailsWith<JwtException> { decoder().decode(token(issuer = "another-issuer")) }
        assertFailsWith<JwtException> { decoder().decode(token(audience = "another-service")) }
    }

    @Test
    fun `rejects unknown roles and malformed subjects`() {
        assertFailsWith<JwtException> { decoder().decode(token(role = "ROOT")) }
        assertFailsWith<JwtException> { decoder().decode(token(subject = "not-a-uuid")) }
    }

    private fun decoder() = JwtConfig("http://127.0.0.1:${server.address.port}/keys", "syndetis-auth", "syndetis")
        .jwtDecoder()

    private fun token(
        subject: String = UUID.randomUUID().toString(),
        issuer: String = "syndetis-auth",
        audience: String = "syndetis",
        role: String = "SELLER",
    ): String {
        val claims = JWTClaimsSet.Builder()
            .subject(subject)
            .issuer(issuer)
            .audience(audience)
            .claim("role", role)
            .issueTime(Date())
            .expirationTime(Date(System.currentTimeMillis() + 300_000))
            .build()
        return SignedJWT(JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test-key").build(), claims)
            .apply { sign(RSASSASigner(key.toPrivateKey())) }
            .serialize()
    }
}
