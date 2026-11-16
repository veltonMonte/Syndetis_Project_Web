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
)

data class PaymentCheckoutResponse(val preferenceId: String, val checkoutUrl: String)

interface PaymentGateway {
    fun createCheckout(request: PaymentCheckoutRequest): PaymentCheckoutResponse
    fun findPayments(orderId: UUID): List<PaymentNotification>
}
