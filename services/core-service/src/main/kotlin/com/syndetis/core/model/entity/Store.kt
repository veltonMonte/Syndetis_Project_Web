package com.syndetis.core.model.entity

import com.syndetis.core.model.enum.StoreStatus
import com.syndetis.core.model.enum.StoreType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "store")
class Store {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null

    @Column(name = "owner_user_id", nullable = false)
    var ownerUserId: UUID? = null

    @Column(nullable = false, length = 100)
    var name: String? = null

    @Column(nullable = false, unique = true, length = 100)
    var slug: String? = null

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var type: StoreType = StoreType.ECOMMERCE

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var status: StoreStatus = StoreStatus.ACTIVE

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now()

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()

    @PrePersist
    fun prePersist() {
        val now = Instant.now()
        createdAt = now
        updatedAt = now
    }

    @PreUpdate
    fun preUpdate() {
        updatedAt = Instant.now()
    }
}
