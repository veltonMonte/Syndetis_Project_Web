package com.syndetis.core.controller

import com.syndetis.core.model.dto.common.PageResponse
import com.syndetis.core.model.dto.order.ChangeOrderStatusRequest
import com.syndetis.core.model.dto.order.OrderResponse
import com.syndetis.core.model.entity.OrderStatus
import com.syndetis.core.service.OrderService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/stores/{storeId}/orders")
class SellerOrderController(private val orders: OrderService) {
    @GetMapping
    fun list(
        @PathVariable storeId: UUID,
        @RequestParam(required = false) status: OrderStatus?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): PageResponse<OrderResponse> = orders.forStore(storeId, status, page, size)

    @PatchMapping("/{orderId}/status")
    fun changeStatus(
        @PathVariable storeId: UUID,
        @PathVariable orderId: UUID,
        @RequestBody request: ChangeOrderStatusRequest,
    ): OrderResponse = orders.changeStatus(storeId, orderId, request.status)
}
