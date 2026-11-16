package com.syndetis.core.service

import com.syndetis.core.exception.ConflictException
import com.syndetis.core.model.dto.billing.*
import com.syndetis.core.repository.SubscriptionRecord
import com.syndetis.core.repository.SubscriptionRepository
import com.syndetis.core.security.CurrentUser
import com.syndetis.core.security.StoreAccessGuard
import org.junit.jupiter.api.Test
import org.mockito.Mockito.*
import tools.jackson.databind.ObjectMapper
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

class SubscriptionStoreTest {
    private val repository = mock(SubscriptionRepository::class.java)
    private val access = mock(StoreAccessGuard::class.java)
    private val user = mock(CurrentUser::class.java)
    private val mapper = ObjectMapper()
    private val store = SubscriptionStore(repository, access, user, BillingPlans(mapper), BillingAccess(repository, true), mapper, SubscriptionPolicy())
    private val id = UUID.randomUUID()
    private val storeId = UUID.randomUUID()
    private val now = Instant.now()
    private val row = SubscriptionRecord(id, storeId, "STANDARD", BigDecimal("29.90"), "sub_test", "cus_test", "ACTIVE", null, null, null, now.minusSeconds(60), "[]")
    private val payment = BillingPayment("pay_test", "RECEIVED", BigDecimal("29.90"), LocalDate.now(ZoneId.of("America/Sao_Paulo")))
    private val snapshot = BillingSnapshot(id, "sub_test", "cus_test", "ACTIVE", BigDecimal("29.90"), "MONTHLY", now, listOf(payment))
    private fun prepare(record: SubscriptionRecord = row) { `when`(repository.lock(id)).thenReturn(record) }

    @Test fun `valid snapshot stores a calendar period and the complete invoice history`() {
        prepare(); store.apply(snapshot)
        val expected = payment.dueDate.plusMonths(1).atStartOfDay(ZoneId.of("America/Sao_Paulo")).toInstant()
        verify(repository).update(id, "sub_test", "cus_test", "ACTIVE", expected, now, mapper.writeValueAsString(snapshot.payments))
    }
    @Test fun `older or duplicate snapshot never restores stale financial state`() {
        prepare(row.copy(observedAt = now))
        store.apply(snapshot); store.apply(snapshot.copy(observedAt = now.minusSeconds(1)))
        verify(repository, times(2)).lock(id)
        verifyNoMoreInteractions(repository)
    }
    @Test fun `provider identity price and duplicated payments are rejected before persistence`() {
        prepare()
        for (invalid in listOf(snapshot.copy(providerId = "sub_other"), snapshot.copy(customerId = "cus_other"),
            snapshot.copy(amount = BigDecimal("0.01")), snapshot.copy(cycle = "YEARLY"),
            snapshot.copy(payments = listOf(payment, payment)))) {
            assertFailsWith<ConflictException> { store.apply(invalid) }
        }
        verify(repository, times(5)).lock(id); verifyNoMoreInteractions(repository)
    }
    @Test fun `invoice URL is restricted to hosted sandbox billing`() {
        prepare()
        assertFailsWith<ConflictException> { store.apply(snapshot.copy(payments = listOf(payment.copy(invoiceUrl = "https://attacker.example/pay")))) }
        verify(repository).lock(id); verifyNoMoreInteractions(repository)
    }
    @Test fun `retry existing subscription never creates another provider request or changes contracted price`() {
        `when`(repository.latest(storeId)).thenReturn(row)
        val claim = store.claim(storeId, SubscribeRequest("STANDARD", "Seller", "12345678909"))
        assertNull(claim.create); assertEquals(BigDecimal("29.90"), claim.record.price)
        verify(access).forManage(storeId); verify(repository).lockStore(storeId)
    }
    @Test fun `concurrent creation lease rejects a second remote request`() {
        `when`(repository.latest(storeId)).thenReturn(row.copy(providerId = null, claimedAt = now))
        assertFailsWith<ConflictException> { store.claim(storeId, SubscribeRequest("STANDARD", "Seller", "12345678909")) }
    }
}
