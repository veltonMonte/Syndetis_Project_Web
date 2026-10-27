package com.syndetis.core.service

import com.syndetis.core.model.dto.billing.BillingPayment
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import kotlin.test.assertEquals
import kotlin.test.assertNull

class SubscriptionPolicyTest {
    private val policy = SubscriptionPolicy()
    private val price = BigDecimal("29.90")
    private val now = Instant.parse("2026-10-27T12:00:00Z")
    private fun payment(status: String = "RECEIVED", amount: String = "29.90", due: String = "2026-10-27") =
        BillingPayment("pay_test", status, BigDecimal(amount), LocalDate.parse(due))

    @Test fun `duplicate confirmation never adds another month`() {
        val p = payment()
        assertEquals(Instant.parse("2026-11-27T03:00:00Z"), policy.paidUntil(listOf(p, p), price, now))
    }
    @Test fun `creation overdue refund and chargeback do not grant access`() {
        for (status in listOf("PENDING", "OVERDUE", "REFUNDED", "CHARGEBACK_REQUESTED", "DELETED", "REFUND_REQUESTED")) {
            assertNull(policy.paidUntil(listOf(payment(status)), price, now))
        }
        assertNull(policy.paidUntil(listOf(payment(amount = "0.01")), price, now))
    }
    @Test fun `future charge alone does not publish the store`() {
        assertNull(policy.paidUntil(listOf(payment(due = "2026-12-27")), price, now))
    }
    @Test fun `month end follows calendar instead of adding thirty days`() {
        assertEquals(Instant.parse("2026-02-28T03:00:00Z"), policy.paidUntil(
            listOf(payment(due = "2026-01-31")), price, Instant.parse("2026-02-01T12:00:00Z")))
    }
    @Test fun `late payment keeps original cycle and does not restart subscription`() {
        assertEquals(Instant.parse("2026-09-27T03:00:00Z"), policy.paidUntil(listOf(payment(due = "2026-08-27")), price, now))
    }
}
