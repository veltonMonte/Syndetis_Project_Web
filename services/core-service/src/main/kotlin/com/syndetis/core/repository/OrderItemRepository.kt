package com.syndetis.core.repository

import com.syndetis.core.model.entity.OrderItem
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface OrderItemRepository : JpaRepository<OrderItem, UUID> {
    fun findAllByOrderId(orderId: UUID): List<OrderItem>
    fun findAllByOrderIdIn(orderIds: Collection<UUID>): List<OrderItem>
}
