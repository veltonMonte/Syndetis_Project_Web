package com.syndetis.core.repository

import com.syndetis.core.model.entity.Customer
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface CustomerRepository : JpaRepository<Customer, UUID> {
    fun findByUserId(userId: UUID): Customer?

    @Modifying
    @Query(value = """
        INSERT INTO customers (id, user_id, name, email)
        VALUES (:id, :userId, :name, :email)
        ON CONFLICT (user_id) DO NOTHING
    """, nativeQuery = true)
    fun insertIfAbsent(
        @Param("id") id: UUID,
        @Param("userId") userId: UUID,
        @Param("name") name: String,
        @Param("email") email: String,
    ): Int
}
