package com.syndetis.core.controller

import com.syndetis.core.model.dto.order.PublicOrderStatusResponse
import com.syndetis.core.service.OrderService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/** "Meus pedidos" on a storefront: follow a paid order with its purchase code, without signing in. */
@RestController
@RequestMapping("/api/public/orders")
class PublicOrderController(private val orders: OrderService) {
    @GetMapping("/{code}")
    fun status(@PathVariable code: String): PublicOrderStatusResponse = orders.publicStatus(code)
}
