package com.syndetis.core.payment

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Encrypts merchants' Mercado Pago tokens at rest (AES-256-GCM, random 96-bit nonce per value). The key comes
 * from PAYMENT_TOKEN_KEY; deployed environments must set their own (the kubernetes profile has no default).
 */
@Component
class TokenCipher(@Value("\${core.payments.token-key:syndetis-local-payment-token-key}") secret: String) {
    private val key = SecretKeySpec(MessageDigest.getInstance("SHA-256").digest(secret.toByteArray()), "AES")
    private val random = SecureRandom()

    fun encrypt(plain: String): String {
        val nonce = ByteArray(12).also(random::nextBytes)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(128, nonce)) }
        return "v1:" + Base64.getEncoder().encodeToString(nonce + cipher.doFinal(plain.toByteArray()))
    }

    fun decrypt(stored: String): String {
        require(stored.startsWith("v1:")) { "Formato de token desconhecido" }
        val bytes = Base64.getDecoder().decode(stored.removePrefix("v1:"))
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            .apply { init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, bytes.copyOfRange(0, 12))) }
        return String(cipher.doFinal(bytes.copyOfRange(12, bytes.size)))
    }
}
