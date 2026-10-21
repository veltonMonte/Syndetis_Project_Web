package com.syndetis.core.model.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "addresses")
class Address(
    @Id var id: UUID = UUID.randomUUID(),
    @Column(name = "customer_id", nullable = false) var customerId: UUID,
    @Column(name = "zip_code", nullable = false, length = 8) var zipCode: String,
    @Column(nullable = false, length = 160) var street: String,
    @Column(nullable = false, length = 30) var number: String,
    @Column(length = 160) var complement: String? = null,
    @Column(nullable = false, length = 120) var city: String,
    @Column(nullable = false, length = 2) var state: String,
)
