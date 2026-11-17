package com.syndetis.core.payment

import org.springframework.stereotype.Service
import java.util.UUID

@Service
class PaymentCheckoutService(
    private val store: PaymentCheckoutStore,
    private val gateway: PaymentGateway,
    private val notifications: PaymentNotificationService,
    private val accounts: MercadoPagoAccountService,
) {
    fun create(orderId: UUID): PaymentCheckoutResponse {
        val claim = store.claim(orderId)
        claim.existing?.let { return it }
        try {
            // A store that connected its Mercado Pago account is paid straight into it.
            val request = claim.request.copy(sellerAccessToken = accounts.accessTokenFor(claim.storeId))
            return store.complete(claim.request, gateway.createCheckout(request))
        } catch (exception: Exception) {
            store.release(claim.request)
            throw exception
        }
    }

    fun synchronize(orderId: UUID) {
        reconcile(orderId, store.requireOwner(orderId))
    }

    /** A signed Mercado Pago notification for this order: look the payments up with the store's own token. */
    fun synchronizeFromNotification(orderId: UUID) {
        reconcile(orderId, store.storeOf(orderId))
    }

    private fun reconcile(orderId: UUID, storeId: UUID) {
        gateway.findPayments(orderId, accounts.accessTokenFor(storeId)).filter { it.orderId == orderId }.forEach(notifications::receive)
    }
}
