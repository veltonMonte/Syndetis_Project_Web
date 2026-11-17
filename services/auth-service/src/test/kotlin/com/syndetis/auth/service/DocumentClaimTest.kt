package com.syndetis.auth.service

import com.nimbusds.jose.jwk.RSAKey
import com.syndetis.auth.model.entity.User
import com.syndetis.auth.model.enum.DocumentType
import com.syndetis.auth.model.enum.Role
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import java.security.KeyPairGenerator
import java.security.interfaces.RSAPrivateKey
import java.security.interfaces.RSAPublicKey
import java.time.Instant
import java.util.UUID

class DocumentClaimTest {
    private val rsaKey = KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair().let {
        RSAKey.Builder(it.public as RSAPublicKey).privateKey(it.private as RSAPrivateKey).keyID("test").build()
    }
    private fun user(email: String, role: Role = Role.SELLER, verified: Boolean = false) =
        User(id = UUID.randomUUID(), firstName = "T", email = email, password = "x", role = role,
            documentType = if (verified) DocumentType.CNPJ else null, documentVerifiedAt = if (verified) Instant.now() else null)
    private fun claim(service: JwtService, user: User) = service.validateToken(service.generateToken(user))!!["doc_verified"]

    @Test
    fun `sellers carry whether the Receita Federal confirmed their document`() {
        val jwt = JwtService(rsaKey)
        assertEquals(false, claim(jwt, user("new@example.test")))
        assertEquals(true, claim(jwt, user("confirmed@example.test", verified = true)))
        assertNull(claim(jwt, user("buyer@example.test", role = Role.CUSTOMER)))
        // Confirmed with a CPF before the CNPJ-only rule: has to confirm a CNPJ now.
        val legacy = user("cpf@example.test").apply { documentType = DocumentType.CPF; documentVerifiedAt = Instant.now() }
        assertEquals(false, claim(jwt, legacy))
    }

    @Test
    fun `only the operator's configured sellers are exempt`() {
        val jwt = JwtService(rsaKey, exemptEmails = " Seller@Example.test , ")
        assertEquals(true, claim(jwt, user("seller@example.test")))
        assertEquals(false, claim(jwt, user("other@example.test")))
    }
}
