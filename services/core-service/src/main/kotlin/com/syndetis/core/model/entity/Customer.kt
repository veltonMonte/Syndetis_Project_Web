package com.syndetis.core.model.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "customers")
class Customer(
    @Id var id: UUID = UUID.randomUUID(),
    @Column(name = "user_id", unique = true) var userId: UUID? = null,
    @Column(nullable = false, length = 160) var name: String,
    @Column(nullable = false, length = 320) var email: String,
    @Column(length = 30) var phone: String? = null,
    @Column(length = 32) var document: String? = null,
    @Column(name = "created_at", nullable = false) var createdAt: Instant = Instant.now(),
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant = Instant.now(),
)
