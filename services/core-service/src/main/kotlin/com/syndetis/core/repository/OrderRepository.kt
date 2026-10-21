package com.syndetis.core.repository

import com.syndetis.core.model.entity.Order
import com.syndetis.core.model.entity.OrderStatus
import jakarta.persistence.LockModeType
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface OrderRepository : JpaRepository<Order, UUID> {
    fun findByCustomerIdAndIdempotencyKey(customerId: UUID, idempotencyKey: String): Order?
    fun findAllByCustomerId(customerId: UUID, pageable: Pageable): Page<Order>
    fun findAllByStoreId(storeId: UUID, pageable: Pageable): Page<Order>
    fun findAllByStoreIdAndStatus(storeId: UUID, status: OrderStatus, pageable: Pageable): Page<Order>

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.id = :id")
    fun lockById(@Param("id") id: UUID): Order?

    @Query(value = """
        SELECT id FROM orders
        WHERE status = 'PENDING' AND expires_at < now()
        ORDER BY expires_at, id
        LIMIT 1 FOR UPDATE SKIP LOCKED
    """, nativeQuery = true)
    fun lockNextExpiredId(): UUID?
}
