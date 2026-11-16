package com.syndetis.core.service

import com.syndetis.core.exception.ConflictException
import com.syndetis.core.model.dto.billing.*
import com.syndetis.core.repository.SubscriptionRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class SubscriptionService(private val store: SubscriptionStore, private val gateway: SubscriptionGateway,
    private val repository: SubscriptionRepository, private val access: BillingAccess) {
    private val logger = LoggerFactory.getLogger(javaClass)
    fun create(storeId: UUID, request: SubscribeRequest): SubscriptionView {
        val claim = store.claim(storeId, request)
        val snapshot = if (claim.create != null) gateway.create(claim.create)
            else gateway.synchronize(requireNotNull(claim.record.providerId))
        applyExpected(claim.record.id, snapshot)
        return store.view(storeId)
    }
    fun synchronize(storeId: UUID): SubscriptionView {
        val row = store.owned(storeId)
        val id = row.providerId ?: throw ConflictException("Repita a seleção do mesmo plano para concluir a preparação")
        applyExpected(row.id, gateway.synchronize(id))
        return store.view(storeId)
    }
    fun cancel(storeId: UUID): SubscriptionView {
        val row = store.owned(storeId)
        val id = row.providerId ?: throw ConflictException("Conclua a preparação antes de cancelar")
        gateway.cancel(id)
        store.cancelled(row.id)
        // Preserva paidUntil. O webhook reconcilia eventuais estornos posteriores.
        return store.view(storeId)
    }
    @Scheduled(fixedDelayString = "\${core.billing.reconcile-delay-ms:300000}")
    fun reconcile() {
        if (!access.enabled) return
        repository.latestToReconcile().forEach { id ->
            try {
                val row = repository.lockFree(id)
                row.providerId?.let { applyExpected(row.id, gateway.synchronize(it)) }
            } catch (_: Exception) { logger.warn("Conciliação da assinatura {} pendente; será repetida", id) }
        }
    }
    private fun applyExpected(id: UUID, snapshot: BillingSnapshot) {
        if (snapshot.reference != id) throw ConflictException("A assinatura retornada não corresponde à solicitação")
        store.apply(snapshot)
    }
}
