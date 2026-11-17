package com.syndetis.core.controller

import com.syndetis.core.payment.AuthorizationResponse
import com.syndetis.core.payment.MercadoPagoAccountService
import com.syndetis.core.payment.PaymentAccountStatus
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.CacheControl
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.net.URI
import java.util.UUID

/** The store's Mercado Pago account: connect with OAuth, see which account is connected, disconnect. */
@RestController
class PaymentAccountController(
    private val accounts: MercadoPagoAccountService,
    @Value("\${core.public-origin:http://localhost:8080}") private val publicOrigin: String,
) {
    @GetMapping("/api/stores/{storeId}/payments/mercadopago")
    fun status(@PathVariable storeId: UUID): PaymentAccountStatus = accounts.status(storeId)

    @PostMapping("/api/stores/{storeId}/payments/mercadopago/authorize")
    fun authorize(@PathVariable storeId: UUID): AuthorizationResponse = accounts.authorize(storeId)

    @DeleteMapping("/api/stores/{storeId}/payments/mercadopago")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun disconnect(@PathVariable storeId: UUID) = accounts.disconnect(storeId)

    /** Mercado Pago sends the merchant's browser here; the outcome goes back to the dashboard. */
    @GetMapping("/api/public/payments/mercadopago/callback")
    fun callback(
        @RequestParam(required = false) code: String?,
        @RequestParam(required = false) state: String?,
        @RequestParam(required = false) error: String?,
    ): ResponseEntity<Void> = ResponseEntity.status(HttpStatus.SEE_OTHER)
        .cacheControl(CacheControl.noStore())
        .header("Referrer-Policy", "no-referrer")
        .location(URI.create(publicOrigin.trimEnd('/') + accounts.callback(code, state, error)))
        .build()
}
