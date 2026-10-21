package com.syndetis.core.model.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "products")
class Product(
    @Id var id: UUID = UUID.randomUUID(),
    @Column(name = "store_id", nullable = false) var storeId: UUID,
    @Column(name = "category_id") var categoryId: UUID? = null,
    @Column(nullable = false, length = 160) var name: String,
    @Column(columnDefinition = "text") var description: String? = null,
    @Column(nullable = false, precision = 12, scale = 2) var price: BigDecimal,
    @Column(nullable = false, length = 100) var sku: String,
    @Column(name = "image_url", length = 2048) var imageUrl: String? = null,
    @Column(nullable = false) var active: Boolean = true,
    @Column(name = "created_at", nullable = false) var createdAt: Instant = Instant.now(),
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant = Instant.now(),
)
