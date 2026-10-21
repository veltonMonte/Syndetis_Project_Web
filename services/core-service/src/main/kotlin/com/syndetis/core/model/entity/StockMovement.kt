package com.syndetis.core.model.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

enum class StockMovementType { IN, OUT, RESERVE, RELEASE, ADJUST }

@Entity
@Table(name = "stock_movements")
class StockMovement(
    @Id var id: UUID = UUID.randomUUID(),
    @Column(name = "product_id", nullable = false) var productId: UUID,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20) var type: StockMovementType,
    @Column(name = "quantity_delta", nullable = false) var quantityDelta: Int,
    @Column(name = "reserved_delta", nullable = false) var reservedDelta: Int,
    @Column(nullable = false, length = 500) var reason: String,
    @Column(name = "order_id") var orderId: UUID? = null,
    @Column(name = "created_at", nullable = false) var createdAt: Instant = Instant.now(),
)
