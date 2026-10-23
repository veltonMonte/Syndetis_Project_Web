package com.syndetis.core.event

import java.util.UUID

data class OrderCustomerEvent(
    val name: String,
    val email: String,
    val phone: String? = null,
)

data class OrderEventData(
    val orderId: UUID,
    val storeId: UUID,
    val total: String,
    val customer: OrderCustomerEvent,
)

/**
 * Envelope padronizado de eventos publicado no Redis Stream para o integration-hub.
 * Espelha o contrato CoreEvent esperado pelo consumidor TypeScript.
 */
data class CoreEvent(
    val id: UUID = UUID.randomUUID(),
    val type: String,
    val occurredAt: String,
    val version: Int = 1,
    val data: OrderEventData,
)
