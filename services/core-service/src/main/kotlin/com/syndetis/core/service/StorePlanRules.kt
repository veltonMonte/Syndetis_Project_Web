package com.syndetis.core.service

import com.syndetis.core.exception.ConflictException
import com.syndetis.core.exception.ForbiddenException
import com.syndetis.core.model.dto.billing.BillingPlan
import com.syndetis.core.repository.ProductRepository
import com.syndetis.core.repository.SubscriptionRepository
import org.springframework.stereotype.Service
import java.util.UUID

data class EffectiveStorePlan(val plan: BillingPlan, val enforced: Boolean, val paid: Boolean) {
    val structuralEditing: Boolean get() = !enforced || plan.structuralEditing
    val aiDailyRequestLimit: Int get() = if (enforced && paid) plan.aiDailyRequestLimit else 0
}

@Service
class StorePlanRules(
    private val plans: BillingPlans,
    private val subscriptions: SubscriptionRepository,
    private val products: ProductRepository,
    private val billing: BillingAccess,
) {
    fun resolve(storeId: UUID): EffectiveStorePlan {
        // Explicit local preview mode, consistent with the existing billing bypass.
        // It never permits provider-backed AI calls.
        if (!billing.enabled) return EffectiveStorePlan(plans.get("MAKER"), enforced = false, paid = false)
        val active = subscriptions.active(storeId)
        return EffectiveStorePlan(plans.get(active?.planId ?: "STANDARD"), enforced = true, paid = active != null)
    }

    // Called within the catalog transaction, before loading/mutating products.
    fun lockCatalog(storeId: UUID) = subscriptions.lockStore(storeId)

    fun requireProductCapacity(storeId: UUID) {
        val effective = resolve(storeId)
        if (effective.enforced && products.countByStoreIdAndActiveTrue(storeId) >= effective.plan.activeProductLimit) {
            throw ConflictException("Limite de ${effective.plan.activeProductLimit} produtos ativos atingido. Desative produtos ou altere o plano")
        }
    }

    fun requirePublishCapacity(storeId: UUID) {
        val effective = resolve(storeId)
        if (effective.enforced && products.countByStoreIdAndActiveTrue(storeId) > effective.plan.activeProductLimit) {
            throw ConflictException("Adequação necessária: reduza o catálogo para ${effective.plan.activeProductLimit} produtos ativos antes de republicar")
        }
    }

    fun requireAi(storeId: UUID): Int = resolve(storeId).aiDailyRequestLimit.takeIf { it > 0 }
        ?: throw ForbiddenException("IA exige uma assinatura Maker com período pago vigente")
}
