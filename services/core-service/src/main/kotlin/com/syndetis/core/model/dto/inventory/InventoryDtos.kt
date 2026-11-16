package com.syndetis.core.model.dto.inventory

import com.syndetis.core.model.entity.Inventory
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.util.UUID

data class InventoryResponse(val productId: UUID, val quantity: Int, val reserved: Int, val available: Int)

data class InventoryAdjustmentRequest(
    val delta: Int,
    @field:NotBlank @field:Size(max = 500) val reason: String,
)

fun Inventory.toResponse() = InventoryResponse(productId, quantity, reserved, available)
