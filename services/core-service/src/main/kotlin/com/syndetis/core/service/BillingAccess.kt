package com.syndetis.core.service

import com.syndetis.core.exception.ConflictException
import com.syndetis.core.exception.NotFoundException
import com.syndetis.core.repository.SubscriptionRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class BillingAccess(private val subscriptions: SubscriptionRepository,
    @Value("\${core.billing.enabled:false}") val enabled: Boolean) {
    fun canPublish(storeId: UUID): Boolean = !enabled || subscriptions.entitled(storeId)
    fun requirePublic(storeId: UUID) { if (!canPublish(storeId)) throw NotFoundException("Loja indisponível") }
    fun requirePaid(storeId: UUID) { if (!canPublish(storeId)) throw ConflictException("Regularize a assinatura da loja para publicar ou receber novas compras") }
}
