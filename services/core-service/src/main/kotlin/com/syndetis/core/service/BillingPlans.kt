package com.syndetis.core.service

import com.syndetis.core.exception.BusinessRuleException
import com.syndetis.core.model.dto.billing.BillingPlan
import org.springframework.stereotype.Component
import tools.jackson.databind.ObjectMapper

@Component
class BillingPlans(mapper: ObjectMapper) {
    val all: List<BillingPlan> = requireNotNull(javaClass.getResourceAsStream("/billing/plans.json")).use { stream ->
        val root = mapper.readTree(stream)
        require(root.path("currency").asText() == "BRL")
        root.path("plans").asSequence().map {
            BillingPlan(it.path("id").asText(), it.path("name").asText(), it.path("priceInCents").asInt()).also { plan ->
                require(plan.id in setOf("STANDARD", "MAKER") && plan.priceInCents > 0 && it.path("billingCycle").asText() == "MONTHLY")
            }
        }.toList().also { require(it.size == 2 && it.map(BillingPlan::id).toSet().size == 2) }
    }
    fun get(id: String): BillingPlan = all.find { it.id == id } ?: throw BusinessRuleException("Plano inválido")
}
