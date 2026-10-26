package com.syndetis.core.model.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

enum class OrderStatus { PENDING, PAID, SHIPPED, DELIVERED, CANCELED }

@Entity
@Table(name = "orders")
class Order(
    @Id var id: UUID = UUID.randomUUID(),
    @Column(name = "store_id", nullable = false) var storeId: UUID,
    @Column(name = "customer_id", nullable = false) var customerId: UUID,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20) var status: OrderStatus = OrderStatus.PENDING,
    @Column(name = "idempotency_key", nullable = false, length = 128) var idempotencyKey: String,
    @Column(name = "request_hash", nullable = false, length = 64) var requestHash: String,
    @Column(nullable = false, precision = 12, scale = 2) var subtotal: BigDecimal,
    @Column(nullable = false, precision = 12, scale = 2) var shipping: BigDecimal = BigDecimal.ZERO.setScale(2),
    @Column(nullable = false, precision = 12, scale = 2) var total: BigDecimal,
    @Column(name = "expires_at", nullable = false) var expiresAt: Instant,
    @Column(name = "created_at", nullable = false) var createdAt: Instant = Instant.now(),
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant = Instant.now(),
    @Version @Column(nullable = false) var version: Long = 0,
    @Column(name = "delivery_address") var deliveryAddress: String? = null,
    @Column(name = "delivery_instructions", nullable = false, length = 1000)
    var deliveryInstructions: String = "Entrega a combinar com o vendedor.",
    @Column(name = "checkout_request_id") var checkoutRequestId: UUID? = null,
    @Column(name = "checkout_started_at") var checkoutStartedAt: Instant? = null,
    @Column(name = "preference_id", length = 200) var preferenceId: String? = null,
    @Column(name = "checkout_url") var checkoutUrl: String? = null,
    @Column(name = "payment_review_required", nullable = false) var paymentReviewRequired: Boolean = false,
)
