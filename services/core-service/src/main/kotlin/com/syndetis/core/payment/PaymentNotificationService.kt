package com.syndetis.core.payment

import com.syndetis.core.event.OrderDomainEvent
import com.syndetis.core.exception.ConflictException
import com.syndetis.core.exception.NotFoundException
import com.syndetis.core.model.entity.OrderStatus
import com.syndetis.core.repository.OrderItemRepository
import com.syndetis.core.repository.OrderRepository
import com.syndetis.core.service.InventoryService
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Pattern
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.ApplicationEventPublisher
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class PaymentNotification(
    @field:Pattern(regexp = "^[0-9]{1,100}$") val paymentId: String,
    val orderId: UUID,
    @field:Pattern(regexp = "^[a-z_]{1,40}$") val status: String,
    @field:DecimalMin("0.00") val amount: BigDecimal,
    val currency: String,
    val liveMode: Boolean,
)

@Service
class PaymentNotificationService(
    private val orders: OrderRepository,
    private val items: OrderItemRepository,
    private val inventory: InventoryService,
    private val events: ApplicationEventPublisher,
    private val jdbc: JdbcTemplate,
    @Value("\${core.payments.sandbox:true}") private val sandbox: Boolean,
) {
    private val logger = LoggerFactory.getLogger(javaClass)

    @Transactional
    fun receive(payment: PaymentNotification) {
        val order = orders.lockById(payment.orderId) ?: throw NotFoundException("Pedido não encontrado")
        if (payment.liveMode == sandbox || payment.currency != "BRL" || payment.amount.compareTo(order.total) != 0) {
            order.paymentReviewRequired = true
            logger.error("Pagamento {} do pedido {} requer revisão: ambiente, moeda ou total divergente", payment.paymentId, order.id)
            return
        }
        val previous = jdbc.queryForList("SELECT payment_id FROM payment_receipts WHERE order_id = ? AND status = 'approved'", order.id)
            .map { it["payment_id"].toString() }
        val owner = jdbc.queryForList("SELECT order_id FROM payment_receipts WHERE payment_id = ?", payment.paymentId)
        if (owner.isNotEmpty() && owner.first()["order_id"].toString() != order.id.toString()) {
            throw ConflictException("Pagamento já associado a outro pedido")
        }
        jdbc.update("""
            INSERT INTO payment_receipts (payment_id, order_id, status, amount) VALUES (?, ?, ?, ?)
            ON CONFLICT (payment_id) DO UPDATE SET status = EXCLUDED.status, received_at = now()
        """, payment.paymentId, order.id, payment.status, payment.amount)
        if (payment.status != "approved") {
            if (payment.status in setOf("refunded", "charged_back")) order.paymentReviewRequired = true
            return
        }
        if (payment.paymentId in previous) return
        if (previous.isNotEmpty() || order.status != OrderStatus.PENDING || !order.expiresAt.isAfter(Instant.now())) {
            order.paymentReviewRequired = true
            logger.error("Pagamento aprovado {} do pedido {} exige conciliação; pedido {}", payment.paymentId, order.id, order.status)
            return
        }
        inventory.commit(items.findAllByOrderId(order.id).associate { it.productId to it.quantity }, order.id)
        order.status = OrderStatus.PAID
        order.updatedAt = Instant.now()
        events.publishEvent(OrderDomainEvent(orderId = order.id, storeId = order.storeId, customerId = order.customerId,
            total = order.total, type = "order.paid"))
    }
}
