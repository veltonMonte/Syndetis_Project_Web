package com.syndetis.core.model.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal
import java.util.UUID

@Entity
@Table(name = "order_items")
class OrderItem(
    @Id var id: UUID = UUID.randomUUID(),
    @Column(name = "order_id", nullable = false) var orderId: UUID,
    @Column(name = "product_id", nullable = false) var productId: UUID,
    @Column(name = "product_name", nullable = false, length = 160) var productName: String,
    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2) var unitPrice: BigDecimal,
    @Column(nullable = false) var quantity: Int,
)
