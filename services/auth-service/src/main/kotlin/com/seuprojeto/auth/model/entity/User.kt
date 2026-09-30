package com.seuprojeto.auth.model.entity

import com.seuprojeto.auth.model.enum.Role
import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "users")
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id : UUID? = null,

    @Column(nullable = false)
    var firstName: String,

    @Column(nullable = false)
    var email: String,

    @Column(nullable = false)
    var password: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var role: Role = Role.CUSTOMER,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
) {



}