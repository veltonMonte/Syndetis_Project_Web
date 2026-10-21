package com.syndetis.core.service

import com.syndetis.core.exception.ConflictException
import com.syndetis.core.model.entity.OrderStatus
import org.junit.jupiter.api.Test
import kotlin.test.assertFailsWith

class OrderStateMachineTest {
    private val machine = OrderStateMachine()

    @Test
    fun `allows the e-commerce fulfillment path`() {
        machine.requireTransition(OrderStatus.PENDING, OrderStatus.PAID)
        machine.requireTransition(OrderStatus.PAID, OrderStatus.SHIPPED)
        machine.requireTransition(OrderStatus.SHIPPED, OrderStatus.DELIVERED)
    }

    @Test
    fun `rejects skipping states and modifying terminal orders`() {
        assertFailsWith<ConflictException> { machine.requireTransition(OrderStatus.PENDING, OrderStatus.SHIPPED) }
        assertFailsWith<ConflictException> { machine.requireTransition(OrderStatus.CANCELED, OrderStatus.PAID) }
    }
}
