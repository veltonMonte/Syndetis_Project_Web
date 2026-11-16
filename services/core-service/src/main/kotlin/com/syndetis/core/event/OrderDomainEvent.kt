package com.syndetis.core.event

import java.math.BigDecimal
import java.util.UUID

/**
 * Evento interno de domínio disparado após alterações no ciclo de vida de um pedido.
 */
data class OrderDomainEvent(
    val orderId: UUID,
    val storeId: UUID,
    val customerId: UUID,
    val total: BigDecimal,
    val type: String,
)
