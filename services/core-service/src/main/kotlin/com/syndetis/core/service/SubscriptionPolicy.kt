package com.syndetis.core.service

import com.syndetis.core.model.dto.billing.BillingPayment
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.time.Instant
import java.time.ZoneId

@Component
class SubscriptionPolicy {
    fun paidUntil(payments: List<BillingPayment>, price: BigDecimal, now: Instant = Instant.now()): Instant? {
        val periods = payments
        .filter { it.status in setOf("CONFIRMED", "RECEIVED") && it.amount.compareTo(price) == 0 }
        // O período é vinculado ao vencimento, nunca à quantidade de webhooks recebidos.
        .map { it.dueDate.atStartOfDay(ZONE).toInstant() to it.dueDate.plusMonths(1).atStartOfDay(ZONE).toInstant() }
        .sortedBy { it.first }
        var end: Instant? = null
        for ((start, until) in periods) {
            if (!start.isAfter(now) || end?.let { !start.isAfter(it) } == true) {
                if (end == null || until.isAfter(end)) end = until
            }
        }
        return end
    }
    private companion object { val ZONE: ZoneId = ZoneId.of("America/Sao_Paulo") }
}
