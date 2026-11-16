package com.syndetis.core.service

import com.syndetis.core.exception.BusinessRuleException
import com.syndetis.core.exception.ConflictException
import com.syndetis.core.exception.NotFoundException
import com.syndetis.core.model.dto.inventory.InventoryResponse
import com.syndetis.core.model.dto.inventory.toResponse
import com.syndetis.core.model.entity.Inventory
import com.syndetis.core.model.entity.StockMovement
import com.syndetis.core.model.entity.StockMovementType
import com.syndetis.core.repository.InventoryRepository
import com.syndetis.core.repository.ProductRepository
import com.syndetis.core.repository.StockMovementRepository
import com.syndetis.core.security.StoreAccessGuard
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class InventoryService(
    private val inventory: InventoryRepository,
    private val movements: StockMovementRepository,
    private val products: ProductRepository,
    private val access: StoreAccessGuard,
) {
    @Transactional
    fun createForProduct(productId: UUID) {
        inventory.save(Inventory(productId = productId))
    }

    @Transactional(readOnly = true)
    fun forStore(storeId: UUID): List<InventoryResponse> {
        access.forRead(storeId)
        return inventory.findForStore(storeId).map { it.toResponse() }
    }

    @Transactional
    fun adjust(storeId: UUID, productId: UUID, delta: Int, reason: String): InventoryResponse {
        access.forManage(storeId)
        requireProductInStore(storeId, productId)
        if (delta == 0) throw BusinessRuleException("Ajuste deve ser diferente de zero")
        val stock = lock(productId)
        val next = stock.quantity.toLong() + delta
        if (next !in stock.reserved.toLong()..Int.MAX_VALUE.toLong()) {
            throw ConflictException("Ajuste deixaria o estoque abaixo das reservas")
        }
        stock.quantity = next.toInt()
        record(productId, if (delta > 0) StockMovementType.IN else StockMovementType.OUT, delta, 0, reason)
        return stock.toResponse()
    }

    @Transactional
    fun reserve(items: Map<UUID, Int>, orderId: UUID) {
        locked(items).forEach { (stock, amount) ->
            if (stock.available < amount) throw ConflictException("Estoque insuficiente para o produto ${stock.productId}")
            stock.reserved += amount
            record(stock.productId, StockMovementType.RESERVE, 0, amount, "Reserva do pedido", orderId)
        }
    }

    @Transactional
    fun commit(items: Map<UUID, Int>, orderId: UUID) {
        locked(items).forEach { (stock, amount) ->
            if (stock.reserved < amount) throw ConflictException("Reserva insuficiente para o produto ${stock.productId}")
            stock.quantity -= amount
            stock.reserved -= amount
            record(stock.productId, StockMovementType.OUT, -amount, -amount, "Pedido pago", orderId)
        }
    }

    @Transactional
    fun release(items: Map<UUID, Int>, orderId: UUID) {
        locked(items).forEach { (stock, amount) ->
            if (stock.reserved < amount) throw ConflictException("Reserva insuficiente para o produto ${stock.productId}")
            stock.reserved -= amount
            record(stock.productId, StockMovementType.RELEASE, 0, -amount, "Reserva liberada", orderId)
        }
    }

    @Transactional
    fun restore(items: Map<UUID, Int>, orderId: UUID) {
        locked(items).forEach { (stock, amount) ->
            val next = stock.quantity.toLong() + amount
            if (next > Int.MAX_VALUE) throw ConflictException("Estoque excede o limite permitido")
            stock.quantity = next.toInt()
            record(stock.productId, StockMovementType.IN, amount, 0, "Pedido cancelado após pagamento", orderId)
        }
    }

    private fun locked(items: Map<UUID, Int>): List<Pair<Inventory, Int>> {
        if (items.isEmpty() || items.values.any { it <= 0 }) throw BusinessRuleException("Quantidades inválidas")
        return items.entries.sortedBy { it.key }.map { (productId, amount) -> lock(productId) to amount }
    }

    private fun lock(productId: UUID): Inventory = inventory.lockByProductId(productId)
        ?: throw NotFoundException("Estoque não encontrado")

    private fun requireProductInStore(storeId: UUID, productId: UUID) {
        val product = products.findById(productId).orElseThrow { NotFoundException("Produto não encontrado") }
        if (product.storeId != storeId) throw NotFoundException("Produto não encontrado")
    }

    private fun record(productId: UUID, type: StockMovementType, quantityDelta: Int, reservedDelta: Int, reason: String, orderId: UUID? = null) {
        movements.save(StockMovement(productId = productId, type = type, quantityDelta = quantityDelta,
            reservedDelta = reservedDelta, reason = reason, orderId = orderId))
    }
}
