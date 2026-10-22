package com.syndetis.core.service

import com.syndetis.core.exception.ConflictException
import com.syndetis.core.model.entity.OrderStatus
import org.springframework.stereotype.Component

@Component
class OrderStateMachine {
    private val allowed = mapOf(
        OrderStatus.PENDING to setOf(OrderStatus.PAID, OrderStatus.CANCELED),
        OrderStatus.PAID to setOf(OrderStatus.SHIPPED, OrderStatus.CANCELED),
        OrderStatus.SHIPPED to setOf(OrderStatus.DELIVERED),
    )

    fun requireTransition(current: OrderStatus, next: OrderStatus) {
        if (next !in allowed[current].orEmpty()) {
            throw ConflictException("Transição de $current para $next não permitida")
        }
    }
}
