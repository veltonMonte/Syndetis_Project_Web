package com.syndetis.core.payment

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import java.math.BigDecimal
import java.time.Instant
import java.util.Base64
import java.util.UUID

class MercadoPagoConnectionTest {
    @Test
    fun `merchant tokens are encrypted at rest and tampering is detected`() {
        val cipher = TokenCipher("test-key")
        val stored = cipher.encrypt("APP_USR-seller-token")
        assertTrue(stored.startsWith("v1:"))
        assertFalse(stored.contains("APP_USR"))
        assertNotEquals(stored, cipher.encrypt("APP_USR-seller-token"), "every value gets its own nonce")
        assertEquals("APP_USR-seller-token", cipher.decrypt(stored))

        val bytes = Base64.getDecoder().decode(stored.removePrefix("v1:"))
        bytes[bytes.size - 1] = (bytes[bytes.size - 1].toInt() xor 1).toByte()
        assertThrows<Exception> { cipher.decrypt("v1:" + Base64.getEncoder().encodeToString(bytes)) }
        assertThrows<Exception> { TokenCipher("other-key").decrypt(stored) }
    }

    @Test
    fun `a connected store is paid into its own account`() {
        val orderId = UUID.randomUUID()
        val storeId = UUID.randomUUID()
        val request = PaymentCheckoutRequest(orderId, UUID.randomUUID(), BigDecimal("59.90"), "buyer@example.test", Instant.now().plusSeconds(600))
        val store = mock(PaymentCheckoutStore::class.java)
        val accounts = mock(MercadoPagoAccountService::class.java)
        `when`(store.claim(orderId)).thenReturn(CheckoutClaim(request, storeId))
        `when`(accounts.accessTokenFor(storeId)).thenReturn("APP_USR-seller")
        val sent = mutableListOf<PaymentCheckoutRequest>()
        val gateway = object : PaymentGateway {
            override fun createCheckout(request: PaymentCheckoutRequest): PaymentCheckoutResponse {
                sent += request
                return PaymentCheckoutResponse("pref", "https://www.mercadopago.com.br/checkout/pref")
            }
            override fun findPayments(orderId: UUID, sellerAccessToken: String?) = emptyList<PaymentNotification>()
        }
        val response = PaymentCheckoutResponse("pref", "https://www.mercadopago.com.br/checkout/pref")
        `when`(store.complete(request, response)).thenReturn(response)

        PaymentCheckoutService(store, gateway, mock(PaymentNotificationService::class.java), accounts).create(orderId)
        assertEquals("APP_USR-seller", sent.single().sellerAccessToken)
        // The token never shows up in logs through the request's text form.
        assertFalse(sent.single().toString().contains("APP_USR"))
    }

    @Test
    fun `a merchant account never prints its tokens`() {
        val account = MercadoPagoAccount("APP_USR-access", "TG-refresh", null, "987654", "LOJA", false, 100)
        assertFalse(account.toString().contains("APP_USR") || account.toString().contains("TG-"))
    }
}
