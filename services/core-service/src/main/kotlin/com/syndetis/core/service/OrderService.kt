package com.syndetis.core.service

import com.syndetis.core.exception.BusinessRuleException
import com.syndetis.core.exception.ConflictException
import com.syndetis.core.exception.NotFoundException
import com.syndetis.core.model.dto.common.PageResponse
import com.syndetis.core.model.dto.order.CreateOrderRequest
import com.syndetis.core.model.dto.order.OrderResponse
import com.syndetis.core.model.dto.order.toResponse
import com.syndetis.core.model.entity.Order
import com.syndetis.core.model.entity.OrderItem
import com.syndetis.core.model.entity.OrderStatus
import com.syndetis.core.model.entity.Product
import com.syndetis.core.model.entity.StoreStatus
import com.syndetis.core.repository.OrderItemRepository
import com.syndetis.core.repository.OrderRepository
import com.syndetis.core.repository.ProductRepository
import com.syndetis.core.repository.StoreRepository
import com.syndetis.core.security.StoreAccessGuard
import com.syndetis.core.event.OrderDomainEvent
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.ApplicationEventPublisher
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.security.MessageDigest
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@Service
class OrderService(
    private val orders: OrderRepository,
    private val orderItems: OrderItemRepository,
    private val stores: StoreRepository,
    private val products: ProductRepository,
    private val inventory: InventoryService,
    private val customers: CustomerService,
    private val access: StoreAccessGuard,
    private val transitions: OrderStateMachine,
    private val jdbc: JdbcTemplate,
    private val eventPublisher: ApplicationEventPublisher,
    @Value("\${core.order.reservation-ttl-minutes:30}") private val reservationTtlMinutes: Long,
    @Value("\${core.payments.enabled:false}") private val paymentsEnabled: Boolean = false,
) {
    @Transactional
    fun create(request: CreateOrderRequest, idempotencyKey: String): OrderResponse {
        requireKey(idempotencyKey)
        val quantities = quantities(request)
        val customerId = customers.currentCustomerId()
        val fingerprint = fingerprint(request.storeId, quantities, request.addressId)

        // Serializa a mesma chave entre instâncias antes da leitura e da reserva.
        jdbc.queryForList("SELECT pg_advisory_xact_lock(hashtextextended(?, 0))", "$customerId:$idempotencyKey")
        orders.findByCustomerIdAndIdempotencyKey(customerId, idempotencyKey)?.let { existing ->
            if (existing.requestHash != fingerprint) throw ConflictException("Idempotency-Key reutilizada com outro pedido")
            return response(existing)
        }

        val store = stores.findById(request.storeId).orElseThrow { NotFoundException("Loja não encontrada") }
        if (store.status != StoreStatus.ACTIVE) throw ConflictException("Loja inativa")
        val address = request.addressId?.let { customers.getAddress(it) }
        if (paymentsEnabled && address == null) throw BusinessRuleException("Informe o endereço de entrega")
        val recipient = address?.let { customers.me() }
        val addressSnapshot = address?.let {
            listOfNotNull(recipient?.name, recipient?.phone, "${it.street}, ${it.number}",
                it.complement?.takeIf(String::isNotBlank), "${it.city}/${it.state}", "CEP ${it.zipCode}")
                .joinToString(" — ")
        }
        val selected = products.findAllById(quantities.keys).associateBy { it.id }
        if (selected.size != quantities.size || selected.values.any { !it.active || it.storeId != request.storeId }) {
            throw BusinessRuleException("Todos os itens devem estar ativos e pertencer à mesma loja")
        }
        val subtotal = quantities.entries.fold(BigDecimal.ZERO) { total, (id, amount) ->
            total + requireNotNull(selected[id]).price.multiply(BigDecimal(amount))
        }.setScale(2)
        val total = subtotal + store.shippingFee
        if (total > MAX_TOTAL || (paymentsEnabled && total.signum() <= 0)) {
            throw BusinessRuleException("Total fora do limite permitido")
        }

        val now = Instant.now()
        val order = Order(storeId = request.storeId, customerId = customerId, idempotencyKey = idempotencyKey,
            requestHash = fingerprint, subtotal = subtotal, shipping = store.shippingFee, total = total,
            deliveryAddress = addressSnapshot, deliveryInstructions = store.deliveryInstructions,
            expiresAt = now.plus(reservationTtlMinutes, ChronoUnit.MINUTES), createdAt = now, updatedAt = now)
        inventory.reserve(quantities, order.id)
        orders.save(order)
        val snapshots = quantities.map { (id, amount) -> snapshot(order.id, requireNotNull(selected[id]), amount) }
        orderItems.saveAll(snapshots)
        eventPublisher.publishEvent(
            OrderDomainEvent(
                orderId = order.id,
                storeId = order.storeId,
                customerId = order.customerId,
                total = order.total,
                type = "order.created",
            )
        )
        return order.toResponse(snapshots)
    }

    @Transactional
    fun mine(page: Int, size: Int): PageResponse<OrderResponse> =
        pageResponse(orders.findAllByCustomerId(customers.currentCustomerId(), pageRequest(page, size)))

    @Transactional
    fun get(orderId: UUID): OrderResponse {
        val customerId = customers.currentCustomerId()
        val order = orders.findById(orderId).orElseThrow { NotFoundException("Pedido não encontrado") }
        if (order.customerId != customerId) throw NotFoundException("Pedido não encontrado")
        return response(order)
    }

    @Transactional
    fun cancelByCustomer(orderId: UUID): OrderResponse {
        val customerId = customers.currentCustomerId()
        val order = lock(orderId)
        if (order.customerId != customerId) throw NotFoundException("Pedido não encontrado")
        if (order.status != OrderStatus.PENDING) throw ConflictException("Este pedido não pode ser cancelado pelo cliente")
        inventory.release(itemQuantities(orderId), orderId)
        order.status = OrderStatus.CANCELED
        order.updatedAt = Instant.now()
        eventPublisher.publishEvent(
            OrderDomainEvent(
                orderId = order.id,
                storeId = order.storeId,
                customerId = order.customerId,
                total = order.total,
                type = "order.canceled",
            )
        )
        return response(order)
    }

    @Transactional(readOnly = true)
    fun forStore(storeId: UUID, status: OrderStatus?, page: Int, size: Int): PageResponse<OrderResponse> {
        access.forRead(storeId)
        val pageable = pageRequest(page, size)
        val result = if (status == null) orders.findAllByStoreId(storeId, pageable)
            else orders.findAllByStoreIdAndStatus(storeId, status, pageable)
        return pageResponse(result)
    }

    @Transactional
    fun changeStatus(storeId: UUID, orderId: UUID, next: OrderStatus): OrderResponse {
        access.forManage(storeId)
        val order = lock(orderId)
        if (order.storeId != storeId) throw NotFoundException("Pedido não encontrado")
        transitions.requireTransition(order.status, next)
        if (order.paymentReviewRequired && next != OrderStatus.CANCELED) {
            throw ConflictException("O pagamento precisa de conciliação antes de continuar o pedido")
        }
        if (paymentsEnabled && (next == OrderStatus.PAID || order.status == OrderStatus.PAID && next == OrderStatus.CANCELED)) {
            throw ConflictException("Pagamento e estorno devem ser confirmados pelo provedor de pagamento")
        }
        val quantities = itemQuantities(orderId)
        when (order.status to next) {
            OrderStatus.PENDING to OrderStatus.PAID -> inventory.commit(quantities, orderId)
            OrderStatus.PENDING to OrderStatus.CANCELED -> inventory.release(quantities, orderId)
            OrderStatus.PAID to OrderStatus.CANCELED -> inventory.restore(quantities, orderId)
            else -> Unit
        }
        order.status = next
        order.updatedAt = Instant.now()
        val eventType = when (next) {
            OrderStatus.PAID -> "order.paid"
            OrderStatus.SHIPPED -> "order.shipped"
            OrderStatus.DELIVERED -> "order.delivered"
            OrderStatus.CANCELED -> "order.canceled"
            OrderStatus.PENDING -> null
        }
        if (eventType != null) {
            eventPublisher.publishEvent(
                OrderDomainEvent(
                    orderId = order.id,
                    storeId = order.storeId,
                    customerId = order.customerId,
                    total = order.total,
                    type = eventType,
                )
            )
        }
        return response(order)
    }

    @Transactional
    fun expireOne(): Boolean {
        val orderId = orders.lockNextExpiredId() ?: return false
        val order = orders.findById(orderId).orElseThrow { NotFoundException("Pedido não encontrado") }
        inventory.release(itemQuantities(orderId), orderId)
        order.status = OrderStatus.CANCELED
        order.updatedAt = Instant.now()
        eventPublisher.publishEvent(
            OrderDomainEvent(
                orderId = order.id,
                storeId = order.storeId,
                customerId = order.customerId,
                total = order.total,
                type = "order.canceled",
            )
        )
        return true
    }

    private fun response(order: Order): OrderResponse = order.toResponse(orderItems.findAllByOrderId(order.id))

    private fun pageResponse(page: Page<Order>): PageResponse<OrderResponse> {
        val items = if (page.isEmpty) emptyMap() else
            orderItems.findAllByOrderIdIn(page.content.map { it.id }).groupBy { it.orderId }
        return PageResponse(page.content.map { it.toResponse(items[it.id].orEmpty()) }, page.number, page.size,
            page.totalElements, page.totalPages)
    }

    private fun itemQuantities(orderId: UUID): Map<UUID, Int> =
        orderItems.findAllByOrderId(orderId).associate { it.productId to it.quantity }

    private fun snapshot(orderId: UUID, product: Product, quantity: Int) =
        OrderItem(orderId = orderId, productId = product.id, productName = product.name,
            unitPrice = product.price, quantity = quantity)

    private fun lock(orderId: UUID): Order = orders.lockById(orderId)
        ?: throw NotFoundException("Pedido não encontrado")

    private fun quantities(request: CreateOrderRequest): Map<UUID, Int> {
        if (request.items.isEmpty() || request.items.size > 100 || request.items.any { it.quantity <= 0 }) {
            throw BusinessRuleException("Itens inválidos")
        }
        if (request.items.map { it.productId }.toSet().size != request.items.size) {
            throw BusinessRuleException("Produto duplicado no pedido")
        }
        return request.items.associate { it.productId to it.quantity }
    }

    private fun requireKey(key: String) {
        if (!KEY_PATTERN.matches(key)) throw BusinessRuleException("Idempotency-Key inválida")
    }

    private fun fingerprint(storeId: UUID, quantities: Map<UUID, Int>, addressId: UUID?): String {
        val canonical = "$storeId|" + quantities.entries.sortedBy { it.key }
            .joinToString(";") { "${it.key}:${it.value}" } + (addressId?.let { "|address:$it" } ?: "")
        return MessageDigest.getInstance("SHA-256").digest(canonical.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it.toInt() and 0xff) }
    }

    private fun pageRequest(page: Int, size: Int): PageRequest {
        if (page < 0 || size !in 1..100) throw BusinessRuleException("Paginação inválida")
        return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by("id")))
    }

    private companion object {
        val KEY_PATTERN = Regex("^[A-Za-z0-9._:-]{8,128}$")
        val MAX_TOTAL = BigDecimal("9999999999.99")
    }
}
