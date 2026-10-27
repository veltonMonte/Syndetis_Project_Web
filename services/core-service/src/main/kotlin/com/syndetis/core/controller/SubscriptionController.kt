package com.syndetis.core.controller

import com.syndetis.core.exception.ForbiddenException
import com.syndetis.core.exception.ServiceUnavailableException
import com.syndetis.core.model.dto.billing.*
import com.syndetis.core.service.*
import jakarta.validation.Valid
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import java.security.MessageDigest
import java.util.UUID

@RestController
class SubscriptionController(private val subscriptions: SubscriptionService, private val store: SubscriptionStore,
    private val plans: BillingPlans, private val access: BillingAccess,
    @Value("\${core.billing.internal-token:}") private val token: String) {
    @GetMapping("/api/public/plans") fun plans() = BillingCatalog(enabled = access.enabled, plans = plans.all)
    @GetMapping("/api/stores/{storeId}/subscription")
    fun get(@PathVariable storeId: UUID) = store.view(storeId)
    @PostMapping("/api/stores/{storeId}/subscription")
    fun create(@PathVariable storeId: UUID, @Valid @RequestBody body: SubscribeRequest) = subscriptions.create(storeId, body)
    @PostMapping("/api/stores/{storeId}/subscription/sync")
    fun sync(@PathVariable storeId: UUID) = subscriptions.synchronize(storeId)
    @PostMapping("/api/stores/{storeId}/subscription/cancel")
    fun cancel(@PathVariable storeId: UUID) = subscriptions.cancel(storeId)
    @PostMapping("/internal/billing/notifications") @ResponseStatus(HttpStatus.NO_CONTENT)
    fun notify(@RequestHeader("X-Internal-Token", defaultValue = "") actual: String, @Valid @RequestBody snapshot: BillingSnapshot) {
        if (!access.enabled || token.length < 32) throw ServiceUnavailableException("Assinaturas não configuradas")
        if (!MessageDigest.isEqual(token.toByteArray(), actual.toByteArray())) throw ForbiddenException("Credencial interna inválida")
        store.apply(snapshot)
    }
}
