package com.syndetis.core.controller

import com.syndetis.core.exception.ForbiddenException
import com.syndetis.core.exception.ServiceUnavailableException
import com.syndetis.core.payment.PaymentCheckoutResponse
import com.syndetis.core.payment.PaymentCheckoutService
import com.syndetis.core.payment.PaymentNotification
import com.syndetis.core.payment.PaymentNotificationService
import jakarta.validation.Valid
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.security.MessageDigest
import java.util.UUID

@RestController
class PaymentController(
    private val checkout: PaymentCheckoutService,
    private val notifications: PaymentNotificationService,
    @Value("\${core.payments.internal-token:}") private val internalToken: String,
) {
    @PostMapping("/api/orders/{orderId}/payment")
    fun create(@PathVariable orderId: UUID): PaymentCheckoutResponse = checkout.create(orderId)

    @PostMapping("/api/orders/{orderId}/payment/sync")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun synchronize(@PathVariable orderId: UUID) = checkout.synchronize(orderId)

    @PostMapping("/internal/payments/notifications")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun notify(
        @RequestHeader("X-Internal-Token", defaultValue = "") token: String,
        @Valid @RequestBody payment: PaymentNotification,
    ) {
        if (internalToken.length < 32) throw ServiceUnavailableException("Pagamento ainda não configurado")
        if (!MessageDigest.isEqual(internalToken.toByteArray(), token.toByteArray())) {
            throw ForbiddenException("Credencial interna inválida")
        }
        notifications.receive(payment)
    }
}
