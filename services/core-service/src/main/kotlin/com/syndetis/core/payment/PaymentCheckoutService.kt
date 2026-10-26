package com.syndetis.core.payment

import org.springframework.stereotype.Service
import java.util.UUID

@Service
class PaymentCheckoutService(
    private val store: PaymentCheckoutStore,
    private val gateway: PaymentGateway,
    private val notifications: PaymentNotificationService,
) {
    fun create(orderId: UUID): PaymentCheckoutResponse {
        val claim = store.claim(orderId)
        claim.existing?.let { return it }
        try {
            return store.complete(claim.request, gateway.createCheckout(claim.request))
        } catch (exception: Exception) {
            store.release(claim.request)
            throw exception
        }
    }

    fun synchronize(orderId: UUID) {
        store.requireOwner(orderId)
        gateway.findPayments(orderId).filter { it.orderId == orderId }.forEach(notifications::receive)
    }
}
