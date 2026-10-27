package com.syndetis.core.service

import com.syndetis.core.exception.ConflictException
import com.syndetis.core.exception.ServiceUnavailableException
import com.syndetis.core.model.dto.billing.*
import com.syndetis.core.repository.SubscriptionRecord
import com.syndetis.core.repository.SubscriptionRepository
import com.syndetis.core.security.CurrentUser
import com.syndetis.core.security.StoreAccessGuard
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper
import java.math.BigDecimal
import java.net.URI
import java.time.Instant
import java.util.UUID

data class SubscriptionClaim(val record: SubscriptionRecord, val create: BillingCreateRequest?)

@Service
class SubscriptionStore(private val subscriptions: SubscriptionRepository, private val access: StoreAccessGuard,
    private val currentUser: CurrentUser, private val plans: BillingPlans, private val billing: BillingAccess,
    private val mapper: ObjectMapper, private val policy: SubscriptionPolicy) {

    @Transactional
    fun claim(storeId: UUID, request: SubscribeRequest): SubscriptionClaim {
        requireEnabled()
        access.forManage(storeId)
        subscriptions.lockStore(storeId)
        val plan = plans.get(request.planId)
        var record = subscriptions.latest(storeId)
        if (record != null && record.cancelledAt == null) {
            if (record.planId != plan.id) throw ConflictException("Cancele a renovação e aguarde o fim do período pago para escolher outro plano")
            if (record.providerId != null) return SubscriptionClaim(record, null)
        } else {
            if (billing.canPublish(storeId)) throw ConflictException("Aguarde o fim do período já pago antes de iniciar outra assinatura")
            val id = UUID.randomUUID()
            subscriptions.insert(id, storeId, plan.id, BigDecimal(plan.priceInCents).movePointLeft(2))
            record = subscriptions.lock(id)
        }
        val selected = requireNotNull(record)
        if (selected.claimedAt?.isAfter(Instant.now().minusSeconds(120)) == true) {
            throw ConflictException("Assinatura em preparação. Aguarde dois minutos antes de repetir a tentativa")
        }
        subscriptions.claim(selected.id, Instant.now())
        return SubscriptionClaim(selected, BillingCreateRequest(selected.id, request.name.trim(), currentUser.email(),
            request.cpfCnpj, plan.name, selected.price))
    }

    @Transactional(readOnly = true)
    fun view(storeId: UUID): SubscriptionView {
        access.forRead(storeId)
        val row = subscriptions.latest(storeId)
        val active = billing.canPublish(storeId)
        return if (row == null) SubscriptionView(enabled = billing.enabled, status = if (billing.enabled) "NONE" else "DISABLED", canPublish = active)
        else SubscriptionView(enabled = billing.enabled, id = row.id, planId = row.planId, monthlyPrice = row.price,
            status = when { active -> "ACTIVE"; row.cancelledAt != null -> "CANCELED"; row.providerId == null -> "PREPARING";
                row.paidUntil == null -> "PENDING"; else -> "EXPIRED" }, canPublish = active,
            paidUntil = row.paidUntil, cancelled = row.cancelledAt != null, payments = payments(row.payments))
    }

    @Transactional(readOnly = true)
    fun owned(storeId: UUID): SubscriptionRecord {
        requireEnabled(); access.forManage(storeId)
        return subscriptions.latest(storeId) ?: throw ConflictException("Escolha um plano primeiro")
    }

    @Transactional
    fun apply(snapshot: BillingSnapshot) {
        requireEnabled()
        val row = subscriptions.lock(snapshot.reference)
        if ((row.providerId != null && row.providerId != snapshot.providerId) ||
            (row.customerId != null && row.customerId != snapshot.customerId) || snapshot.amount.compareTo(row.price) != 0 ||
            snapshot.cycle != "MONTHLY" || snapshot.providerStatus !in setOf("ACTIVE", "INACTIVE", "EXPIRED", "DELETED")) {
            throw ConflictException("Assinatura divergente; é necessária conciliação")
        }
        if (snapshot.observedAt.isAfter(Instant.now().plusSeconds(60))) throw ConflictException("Data de conciliação inválida")
        if (row.observedAt != null && !snapshot.observedAt.isAfter(row.observedAt)) return
        if (snapshot.payments.map { it.id }.toSet().size != snapshot.payments.size) throw ConflictException("Cobrança duplicada na conciliação")
        snapshot.payments.forEach { payment ->
            payment.invoiceUrl?.let { raw ->
                val url = URI(raw)
                if (url.scheme != "https" || url.host != "sandbox.asaas.com" || url.rawUserInfo != null || url.port != -1) {
                    throw ConflictException("URL da cobrança inválida")
                }
            }
        }
        subscriptions.update(row.id, snapshot.providerId, snapshot.customerId, snapshot.providerStatus,
            policy.paidUntil(snapshot.payments, row.price), snapshot.observedAt, mapper.writeValueAsString(snapshot.payments))
    }

    @Transactional
    fun cancelled(id: UUID) { subscriptions.lock(id); subscriptions.cancel(id) }

    private fun payments(json: String): List<BillingPayment> = mapper.readTree(json).asSequence().map { mapper.treeToValue(it, BillingPayment::class.java) }.toList()
    private fun requireEnabled() { if (!billing.enabled) throw ServiceUnavailableException("Assinaturas ainda não habilitadas") }
}
