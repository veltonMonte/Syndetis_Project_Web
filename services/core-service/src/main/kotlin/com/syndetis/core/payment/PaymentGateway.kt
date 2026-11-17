package com.syndetis.core.payment

import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class PaymentCheckoutRequest(
    val orderId: UUID,
    val requestId: UUID,
    val amount: BigDecimal,
    val email: String,
    val expiresAt: Instant,
    /** The store's own Mercado Pago token; null charges into the platform account (stores not connected yet). */
    val sellerAccessToken: String? = null,
) {
    override fun toString() = "PaymentCheckoutRequest(orderId=$orderId, requestId=$requestId, amount=$amount)"
}

data class PaymentCheckoutResponse(val preferenceId: String, val checkoutUrl: String)

interface PaymentGateway {
    fun createCheckout(request: PaymentCheckoutRequest): PaymentCheckoutResponse
    fun findPayments(orderId: UUID, sellerAccessToken: String? = null): List<PaymentNotification>
}
