package com.syndetis.core.controller

import com.syndetis.core.model.dto.common.PageResponse
import com.syndetis.core.model.dto.order.CreateOrderRequest
import com.syndetis.core.model.dto.order.OrderResponse
import com.syndetis.core.service.OrderService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/orders")
class OrderController(private val orders: OrderService) {
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @RequestHeader("Idempotency-Key") idempotencyKey: String,
        @Valid @RequestBody request: CreateOrderRequest,
    ): OrderResponse = orders.create(request, idempotencyKey)

    @GetMapping("/me")
    fun mine(@RequestParam(defaultValue = "0") page: Int, @RequestParam(defaultValue = "20") size: Int): PageResponse<OrderResponse> =
        orders.mine(page, size)

    @GetMapping("/{orderId}")
    fun get(@PathVariable orderId: UUID): OrderResponse = orders.get(orderId)

    @PostMapping("/{orderId}/cancel")
    fun cancel(@PathVariable orderId: UUID): OrderResponse = orders.cancelByCustomer(orderId)
}
