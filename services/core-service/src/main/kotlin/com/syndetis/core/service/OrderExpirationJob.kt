package com.syndetis.core.service

import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class OrderExpirationJob(private val orders: OrderService) {
    @Scheduled(fixedDelayString = "\${core.order.expiration-scan-ms:60000}")
    fun expirePendingOrders() {
        repeat(100) {
            if (!orders.expireOne()) return
        }
    }
}
