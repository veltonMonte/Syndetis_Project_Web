package com.syndetis.core.service

import com.syndetis.core.model.dto.billing.*
import com.syndetis.core.repository.LayoutConfigRepository
import com.syndetis.core.repository.ProductRepository
import com.syndetis.core.security.StoreAccessGuard
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper
import java.util.UUID

@Service
class StoreEntitlementsService(
    private val access: StoreAccessGuard,
    private val rules: StorePlanRules,
    private val products: ProductRepository,
    private val layouts: LayoutConfigRepository,
    private val policy: LayoutPlanPolicy,
    private val ai: AiQuotaService,
    private val mapper: ObjectMapper,
) {
    @Transactional(readOnly = true)
    fun get(storeId: UUID): StoreEntitlements {
        access.forRead(storeId)
        val effective = rules.resolve(storeId)
        val limit = effective.plan.activeProductLimit
        val used = products.countByStoreIdAndActiveTrue(storeId)
        val overLimit = effective.enforced && used > limit
        val adaptation = !effective.structuralEditing && layouts.findById(storeId).map {
            !policy.isTemplateCompatible(mapper.readTree(it.draft))
        }.orElse(false)
        return StoreEntitlements(storeId, effective.plan.id, effective.enforced, effective.paid,
            StoreCapabilities(structuralEditing = effective.structuralEditing, ai = effective.aiDailyRequestLimit > 0),
            ProductAllowance(limit, used, (limit - used).coerceAtLeast(0), overLimit),
            ai.usage(storeId, effective.aiDailyRequestLimit), policy.templateIds, adaptation,
            (!effective.enforced || effective.paid) && !overLimit && !adaptation)
    }
}
