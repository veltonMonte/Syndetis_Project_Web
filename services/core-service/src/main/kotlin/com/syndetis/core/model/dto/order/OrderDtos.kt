package com.syndetis.core.model.dto.order

import com.syndetis.core.model.entity.Order
import com.syndetis.core.model.entity.OrderItem
import com.syndetis.core.model.entity.OrderStatus
import jakarta.validation.Valid
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.Size
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class CreateOrderItemRequest(val productId: UUID, @field:Min(1) val quantity: Int)

data class CreateOrderRequest(
    val storeId: UUID,
    @field:Valid @field:Size(min = 1, max = 100) val items: List<CreateOrderItemRequest>,
)

data class ChangeOrderStatusRequest(val status: OrderStatus)

data class OrderItemResponse(
    val productId: UUID,
    val productName: String,
    val unitPrice: BigDecimal,
    val quantity: Int,
    val lineTotal: BigDecimal,
)

data class OrderResponse(
    val id: UUID,
    val storeId: UUID,
    val status: OrderStatus,
    val subtotal: BigDecimal,
    val shipping: BigDecimal,
    val total: BigDecimal,
    val createdAt: Instant,
    val expiresAt: Instant,
    val items: List<OrderItemResponse>,
)

fun Order.toResponse(items: List<OrderItem>) = OrderResponse(
    id, storeId, status, subtotal, shipping, total, createdAt, expiresAt,
    items.map { OrderItemResponse(it.productId, it.productName, it.unitPrice, it.quantity,
        it.unitPrice.multiply(BigDecimal(it.quantity))) },
)
