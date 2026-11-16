package com.syndetis.core.payment

import com.syndetis.core.exception.ConflictException
import com.syndetis.core.exception.NotFoundException
import com.syndetis.core.exception.ServiceUnavailableException
import com.syndetis.core.model.entity.OrderStatus
import com.syndetis.core.repository.CustomerRepository
import com.syndetis.core.repository.OrderRepository
import com.syndetis.core.service.CustomerService
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

data class CheckoutClaim(val request: PaymentCheckoutRequest, val existing: PaymentCheckoutResponse? = null)

@Service
class PaymentCheckoutStore(
    private val orders: OrderRepository,
    private val customers: CustomerService,
    private val customerRepository: CustomerRepository,
    @Value("\${core.payments.enabled:false}") private val enabled: Boolean,
) {
    @Transactional
    fun claim(orderId: UUID): CheckoutClaim {
        if (!enabled) throw ServiceUnavailableException("Pagamento ainda não habilitado")
        val customerId = customers.currentCustomerId()
        val order = orders.lockById(orderId) ?: throw NotFoundException("Pedido não encontrado")
        if (order.customerId != customerId) throw NotFoundException("Pedido não encontrado")
        val now = Instant.now()
        if (order.status != OrderStatus.PENDING || !order.expiresAt.isAfter(now)) {
            throw ConflictException("O pedido não está disponível para pagamento")
        }
        val email = customerRepository.findById(customerId).orElseThrow().email
        val existing = order.checkoutUrl?.let { PaymentCheckoutResponse(requireNotNull(order.preferenceId), it) }
        if (existing == null) {
            if (order.checkoutStartedAt?.isAfter(now.minusSeconds(60)) == true) {
                throw ConflictException("O pagamento está sendo preparado. Aguarde e tente novamente.")
            }
            order.checkoutRequestId = UUID.randomUUID()
            order.checkoutStartedAt = now
        }
        return CheckoutClaim(PaymentCheckoutRequest(order.id, requireNotNull(order.checkoutRequestId),
            order.total, email, order.expiresAt), existing)
    }

    @Transactional
    fun complete(request: PaymentCheckoutRequest, checkout: PaymentCheckoutResponse): PaymentCheckoutResponse {
        val order = orders.lockById(request.orderId) ?: throw NotFoundException("Pedido não encontrado")
        if (order.checkoutRequestId != request.requestId || order.status != OrderStatus.PENDING ||
            !order.expiresAt.isAfter(Instant.now())) {
            throw ConflictException("O pedido mudou durante a preparação do pagamento")
        }
        order.preferenceId = checkout.preferenceId
        order.checkoutUrl = checkout.checkoutUrl
        order.checkoutStartedAt = null
        return checkout
    }

    @Transactional
    fun release(request: PaymentCheckoutRequest) {
        orders.lockById(request.orderId)?.takeIf { it.checkoutRequestId == request.requestId }?.let {
            it.checkoutStartedAt = null
        }
    }

    @Transactional
    fun requireOwner(orderId: UUID) {
        if (!enabled) throw ServiceUnavailableException("Pagamento ainda não habilitado")
        val customerId = customers.currentCustomerId()
        val order = orders.findById(orderId).orElseThrow { NotFoundException("Pedido não encontrado") }
        if (order.customerId != customerId) throw NotFoundException("Pedido não encontrado")
    }
}
