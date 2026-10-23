package com.syndetis.core.event

import com.syndetis.core.repository.CustomerRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.springframework.transaction.event.TransactionPhase
import org.springframework.transaction.event.TransactionalEventListener
import java.time.Instant
import java.util.UUID

@Component
class OrderEventListener(
    private val publisher: CoreEventPublisher,
    private val customerRepository: CustomerRepository,
) {
    private val logger = LoggerFactory.getLogger(OrderEventListener::class.java)

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    fun handleOrderDomainEvent(event: OrderDomainEvent) {
        val customer = customerRepository.findById(event.customerId).orElse(null)
        if (customer == null) {
            logger.warn(
                "Cliente {} não encontrado para o pedido {}; evento {} ignorado",
                event.customerId,
                event.orderId,
                event.type,
            )
            return
        }

        val coreEvent = CoreEvent(
            id = UUID.randomUUID(),
            type = event.type,
            occurredAt = Instant.now().toString(),
            version = 1,
            data = OrderEventData(
                orderId = event.orderId,
                storeId = event.storeId,
                total = event.total.setScale(2).toPlainString(),
                customer = OrderCustomerEvent(
                    name = customer.name,
                    email = customer.email,
                    phone = customer.phone,
                ),
            ),
        )

        publisher.publish(coreEvent)
    }
}
