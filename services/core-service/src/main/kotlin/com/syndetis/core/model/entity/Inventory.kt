package com.syndetis.core.model.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.Version
import java.util.UUID

@Entity
@Table(name = "inventory")
class Inventory(
    @Id @Column(name = "product_id") var productId: UUID,
    @Column(nullable = false) var quantity: Int = 0,
    @Column(nullable = false) var reserved: Int = 0,
    @Version @Column(nullable = false) var version: Long = 0,
) {
    val available: Int get() = quantity - reserved
}
