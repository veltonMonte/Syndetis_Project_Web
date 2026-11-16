package com.syndetis.core.model.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "categories")
class Category(
    @Id var id: UUID = UUID.randomUUID(),
    @Column(name = "store_id", nullable = false) var storeId: UUID,
    @Column(nullable = false, length = 120) var name: String,
    @Column(nullable = false, length = 100) var slug: String,
    @Column(nullable = false) var position: Int = 0,
)
