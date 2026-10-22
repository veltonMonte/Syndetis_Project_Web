package com.seuprojeto.auth.service

import com.nimbusds.jose.jwk.JWKSet
import com.nimbusds.jose.jwk.RSAKey
import com.seuprojeto.auth.config.RsaKeyConfig
import com.seuprojeto.auth.model.entity.User
import com.seuprojeto.auth.model.enum.Role
import io.jsonwebtoken.Jwts
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.mock.env.MockEnvironment
import java.security.KeyPairGenerator
import java.security.interfaces.RSAPrivateCrtKey
import java.security.interfaces.RSAPrivateKey
import java.security.interfaces.RSAPublicKey
import java.util.Base64
import java.util.UUID

class JwtPersistenceAndSecurityTest {

    @Test
    fun `production refuses to start without a persistent signing key`() {
        val environment = MockEnvironment().apply { setActiveProfiles("prod") }
        val config = RsaKeyConfig("prod-key", "", "", "", "", "old-key", environment)
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException::class.java) { config.rsaKey() }
    }

    private fun generateRsaKeyPair(bits: Int = 2048): java.security.KeyPair {
        val keyPairGen = KeyPairGenerator.getInstance("RSA")
        keyPairGen.initialize(bits)
        return keyPairGen.generateKeyPair()
    }

    @Test
    fun `4096 bit key still signs with RS256 for core compatibility`() {
        val keyPair = generateRsaKeyPair(4096)
        val rsaKey = RSAKey.Builder(keyPair.public as RSAPublicKey)
            .privateKey(keyPair.private as RSAPrivateKey)
            .keyID("large-key")
            .build()
        val user = User(
            id = UUID.randomUUID(),
            firstName = "Ana",
            email = "ana@example.com",
            password = "hashedPassword",
            role = Role.CUSTOMER,
        )

        val token = JwtService(rsaKey, 600_000, "http://localhost:8081", "syndetis").generateToken(user)
        val parsed = Jwts.parser()
            .verifyWith(keyPair.public as RSAPublicKey)
            .build()
            .parseSignedClaims(token)

        assertEquals("RS256", parsed.header.algorithm)
        assertEquals(user.id.toString(), parsed.payload.subject)
    }

    private fun privateKeyToPem(privateKey: RSAPrivateKey): String {
        val base64 = Base64.getEncoder().encodeToString(privateKey.encoded)
        return "-----BEGIN PRIVATE KEY-----\n$base64\n-----END PRIVATE KEY-----"
    }

    private fun publicKeyToPem(publicKey: RSAPublicKey): String {
        val base64 = Base64.getEncoder().encodeToString(publicKey.encoded)
        return "-----BEGIN PUBLIC KEY-----\n$base64\n-----END PUBLIC KEY-----"
    }

    @Test
    fun `two instances with the same persistent key verify tokens across restarts`() {
        val keyPair = generateRsaKeyPair()
        val privateKeyPem = privateKeyToPem(keyPair.private as RSAPrivateKey)

        // Simula primeira inicialização do serviço
        val loadedKey1 = RsaKeyConfig.parsePrivateKeyFromPem(privateKeyPem)
        val publicKey1 = RsaKeyConfig.derivePublicKey(loadedKey1)
        val rsaKey1 = RSAKey.Builder(publicKey1)
            .privateKey(loadedKey1)
            .keyID("persistent-key-v1")
            .build()

        val jwtServiceInstance1 = JwtService(
            rsaKey = rsaKey1,
            expirationMs = 600_000,
            issuer = "http://localhost:8081",
            audience = "syndetis"
        )

        val user = User(
            id = UUID.randomUUID(),
            firstName = "Ana",
            email = "ana@example.com",
            password = "hashedPassword",
            role = Role.CUSTOMER
        )

        val token = jwtServiceInstance1.generateToken(user)
        assertNotNull(token)

        // Simula reinicialização do serviço carregando a mesma chave persistente
        val loadedKey2 = RsaKeyConfig.parsePrivateKeyFromPem(privateKeyPem)
        val publicKey2 = RsaKeyConfig.derivePublicKey(loadedKey2)
        val rsaKey2 = RSAKey.Builder(publicKey2)
            .privateKey(loadedKey2)
            .keyID("persistent-key-v1")
            .build()

        val jwtServiceInstance2 = JwtService(
            rsaKey = rsaKey2,
            expirationMs = 600_000,
            issuer = "http://localhost:8081",
            audience = "syndetis"
        )

        // O token emitido pela Instância 1 deve ser perfeitamente validado pela Instância 2
        val claims = jwtServiceInstance2.validateToken(token)
        assertNotNull(claims)
        assertEquals(user.id.toString(), claims!!.subject)
        assertEquals("ana@example.com", claims["email"])
        assertEquals("CUSTOMER", claims["role"])
        assertEquals("http://localhost:8081", claims.issuer)
        assertTrue(claims.audience.contains("syndetis"))
    }

    @Test
    fun `instance with different key rejects token signature`() {
        val keyPairA = generateRsaKeyPair()
        val keyPairB = generateRsaKeyPair()

        val rsaKeyA = RSAKey.Builder(keyPairA.public as RSAPublicKey)
            .privateKey(keyPairA.private as RSAPrivateKey)
            .keyID("key-a")
            .build()

        val rsaKeyB = RSAKey.Builder(keyPairB.public as RSAPublicKey)
            .privateKey(keyPairB.private as RSAPrivateKey)
            .keyID("key-b")
            .build()

        val serviceA = JwtService(rsaKey = rsaKeyA, expirationMs = 600_000, issuer = "http://localhost:8081", audience = "syndetis")
        val serviceB = JwtService(rsaKey = rsaKeyB, expirationMs = 600_000, issuer = "http://localhost:8081", audience = "syndetis")

        val user = User(
            id = UUID.randomUUID(),
            firstName = "Bruno",
            email = "bruno@example.com",
            password = "hashedPassword",
            role = Role.CUSTOMER
        )

        val tokenSignedByA = serviceA.generateToken(user)

        // serviceB possui uma chave pública diferente e deve rejeitar a assinatura
        val claims = serviceB.validateToken(tokenSignedByA)
        assertNull(claims, "Token assinado por chave diferente deve ser rejeitado")
    }

    @Test
    fun `expired token is rejected`() {
        val keyPair = generateRsaKeyPair()
        val rsaKey = RSAKey.Builder(keyPair.public as RSAPublicKey)
            .privateKey(keyPair.private as RSAPrivateKey)
            .keyID("key-exp")
            .build()

        // Expirado imediatamente (-10 segundos)
        val expiredService = JwtService(
            rsaKey = rsaKey,
            expirationMs = -10_000,
            issuer = "http://localhost:8081",
            audience = "syndetis"
        )

        val user = User(
            id = UUID.randomUUID(),
            firstName = "Clara",
            email = "clara@example.com",
            password = "hashedPassword",
            role = Role.CUSTOMER
        )

        val expiredToken = expiredService.generateToken(user)
        val claims = expiredService.validateToken(expiredToken)
        assertNull(claims, "Token expirado deve ser rejeitado")
    }

    @Test
    fun `token with different issuer or audience is rejected`() {
        val keyPair = generateRsaKeyPair()
        val rsaKey = RSAKey.Builder(keyPair.public as RSAPublicKey)
            .privateKey(keyPair.private as RSAPrivateKey)
            .keyID("key-aud-iss")
            .build()

        val emitterService = JwtService(
            rsaKey = rsaKey,
            expirationMs = 600_000,
            issuer = "http://auth-service:8081",
            audience = "syndetis"
        )

        val user = User(
            id = UUID.randomUUID(),
            firstName = "Davi",
            email = "davi@example.com",
            password = "hashedPassword",
            role = Role.CUSTOMER
        )

        val token = emitterService.generateToken(user)

        // Consumidor esperando issuer diferente
        val wrongIssuerService = JwtService(
            rsaKey = rsaKey,
            expirationMs = 600_000,
            issuer = "http://outra-origem:8081",
            audience = "syndetis"
        )
        assertNull(wrongIssuerService.validateToken(token), "Token com issuer divergente deve ser rejeitado")

        // Consumidor esperando audience diferente
        val wrongAudienceService = JwtService(
            rsaKey = rsaKey,
            expirationMs = 600_000,
            issuer = "http://auth-service:8081",
            audience = "outro-servico"
        )
        assertNull(wrongAudienceService.validateToken(token), "Token com audience divergente deve ser rejeitado")
    }

    @Test
    fun `jwkSet with rotation exposes previous and current public keys without private data`() {
        val currentPair = generateRsaKeyPair()
        val previousPair = generateRsaKeyPair()

        val currentPrivPem = privateKeyToPem(currentPair.private as RSAPrivateKey)
        val previousPubPem = publicKeyToPem(previousPair.public as RSAPublicKey)

        val rsaConfig = RsaKeyConfig(
            keyId = "key-current",
            privateKeyPath = "",
            privateKeyValue = currentPrivPem,
            previousPublicKeyValue = previousPubPem,
            previousPublicKeyPath = "",
            previousKeyId = "key-previous",
            environment = MockEnvironment()
        )

        val currentRsaKey = rsaConfig.rsaKey()
        val jwkSet = rsaConfig.jwkSet(currentRsaKey)

        val publicJwkSet = jwkSet.toPublicJWKSet()
        assertEquals(2, publicJwkSet.keys.size)

        val keyIds = publicJwkSet.keys.map { it.keyID }
        assertTrue(keyIds.contains("key-current"))
        assertTrue(keyIds.contains("key-previous"))

        val json = publicJwkSet.toJSONObject().toString()
        val privateParameters = listOf("\"d\":", "\"p\":", "\"q\":", "\"dp\":", "\"dq\":", "\"qi\":")
        for (param in privateParameters) {
            assertTrue(!json.contains(param), "JWKS não pode conter o parâmetro privado $param")
        }
    }
}
