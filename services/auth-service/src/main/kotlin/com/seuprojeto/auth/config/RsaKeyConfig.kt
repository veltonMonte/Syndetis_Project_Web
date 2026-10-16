package com.seuprojeto.auth.config

import com.nimbusds.jose.jwk.JWK
import com.nimbusds.jose.jwk.JWKSet
import com.nimbusds.jose.jwk.RSAKey
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.io.File
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.interfaces.RSAPrivateCrtKey
import java.security.interfaces.RSAPrivateKey
import java.security.interfaces.RSAPublicKey
import java.security.spec.PKCS8EncodedKeySpec
import java.security.spec.RSAPublicKeySpec
import java.security.spec.X509EncodedKeySpec
import java.util.Base64

@Configuration
class RsaKeyConfig(
    @Value("\${jwt.rsa.key-id:auth-key-1}")
    private val keyId: String,

    @Value("\${jwt.rsa.private-key-path:}")
    private val privateKeyPath: String,

    @Value("\${jwt.rsa.private-key-value:}")
    private val privateKeyValue: String,

    @Value("\${jwt.rsa.previous-public-key-value:}")
    private val previousPublicKeyValue: String,

    @Value("\${jwt.rsa.previous-public-key-path:}")
    private val previousPublicKeyPath: String,

    @Value("\${jwt.rsa.previous-key-id:auth-key-old}")
    private val previousKeyId: String
) {
    private val logger = LoggerFactory.getLogger(RsaKeyConfig::class.java)

    @Bean
    fun rsaKey(): RSAKey {
        val (privateKey, publicKey) = loadOrGenerateKeyPair()
        val stableKid = keyId.ifBlank { "auth-key-1" }

        return RSAKey.Builder(publicKey)
            .privateKey(privateKey)
            .keyID(stableKid)
            .build()
    }

    @Bean
    fun jwkSet(rsaKey: RSAKey): JWKSet {
        val keys = mutableListOf<JWK>()
        // Expor estritamente apenas a chave pública
        keys.add(rsaKey.toPublicJWK())

        // Suporte para rotação de chaves: se chave pública antiga for fornecida, publica temporariamente
        val previousPublicKey = loadPreviousPublicKey()
        if (previousPublicKey != null) {
            val prevKey = RSAKey.Builder(previousPublicKey)
                .keyID(previousKeyId.ifBlank { "auth-key-old" })
                .build()
                .toPublicJWK()
            keys.add(prevKey)
            logger.info("Chave pública anterior incluída no JWKS para rotação graciosa (kid='${prevKey.keyID}')")
        }

        return JWKSet(keys)
    }

    private fun loadOrGenerateKeyPair(): Pair<RSAPrivateKey, RSAPublicKey> {
        val pemContent = when {
            privateKeyValue.isNotBlank() -> privateKeyValue
            privateKeyPath.isNotBlank() -> {
                val file = File(privateKeyPath)
                if (!file.exists()) {
                    throw IllegalStateException("Arquivo de chave privada RSA não encontrado no caminho: $privateKeyPath")
                }
                file.readText()
            }
            else -> null
        }

        return if (pemContent != null) {
            logger.info("Carregando chave privada RSA persistente a partir da configuração fornecida")
            val privateKey = parsePrivateKeyFromPem(pemContent)
            val publicKey = derivePublicKey(privateKey)
            Pair(privateKey, publicKey)
        } else {
            logger.warn("Nenhuma chave RSA privada fornecida via JWT_RSA_PRIVATE_KEY_PATH ou JWT_RSA_PRIVATE_KEY_VALUE. Gerando par em memória (modo efêmero para dev/test).")
            val keyPairGenerator = KeyPairGenerator.getInstance("RSA")
            keyPairGenerator.initialize(2048)
            val pair = keyPairGenerator.generateKeyPair()
            Pair(pair.private as RSAPrivateKey, pair.public as RSAPublicKey)
        }
    }

    private fun loadPreviousPublicKey(): RSAPublicKey? {
        val pemContent = when {
            previousPublicKeyValue.isNotBlank() -> previousPublicKeyValue
            previousPublicKeyPath.isNotBlank() -> {
                val file = File(previousPublicKeyPath)
                if (file.exists()) file.readText() else null
            }
            else -> null
        } ?: return null

        return parsePublicKeyFromPem(pemContent)
    }

    companion object {
        fun parsePrivateKeyFromPem(pem: String): RSAPrivateKey {
            val clean = pem
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replace("-----BEGIN RSA PRIVATE KEY-----", "")
                .replace("-----END RSA PRIVATE KEY-----", "")
                .replace("\\s".toRegex(), "")
            val keyBytes = Base64.getDecoder().decode(clean)
            val spec = PKCS8EncodedKeySpec(keyBytes)
            val factory = KeyFactory.getInstance("RSA")
            return factory.generatePrivate(spec) as RSAPrivateKey
        }

        fun derivePublicKey(privateKey: RSAPrivateKey): RSAPublicKey {
            if (privateKey is RSAPrivateCrtKey) {
                val spec = RSAPublicKeySpec(privateKey.modulus, privateKey.publicExponent)
                val factory = KeyFactory.getInstance("RSA")
                return factory.generatePublic(spec) as RSAPublicKey
            }
            throw IllegalArgumentException("A chave privada fornecida deve conter parâmetros CRT para derivar a chave pública correspondente.")
        }

        fun parsePublicKeyFromPem(pem: String): RSAPublicKey {
            val clean = pem
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replace("-----BEGIN RSA PUBLIC KEY-----", "")
                .replace("-----END RSA PUBLIC KEY-----", "")
                .replace("\\s".toRegex(), "")
            val keyBytes = Base64.getDecoder().decode(clean)
            val spec = X509EncodedKeySpec(keyBytes)
            val factory = KeyFactory.getInstance("RSA")
            return factory.generatePublic(spec) as RSAPublicKey
        }
    }
}
