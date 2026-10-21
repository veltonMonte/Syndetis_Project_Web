package com.syndetis.core.model.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

enum class StoreStatus { ACTIVE, INACTIVE }

@Entity
@Table(name = "stores")
class Store(
    @Id
    var id: UUID = UUID.randomUUID(),
    @Column(name = "owner_user_id", nullable = false)
    var ownerUserId: UUID,
    @Column(nullable = false, length = 160)
    var name: String,
    @Column(nullable = false, unique = true, length = 100)
    var slug: String,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var status: StoreStatus = StoreStatus.ACTIVE,
    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.now(),
    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
)
