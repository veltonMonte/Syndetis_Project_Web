package com.syndetis.core.controller

import com.syndetis.core.model.dto.inventory.InventoryAdjustmentRequest
import com.syndetis.core.model.dto.inventory.InventoryResponse
import com.syndetis.core.service.InventoryService
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/stores/{storeId}/inventory")
class InventoryController(private val inventory: InventoryService) {
    @GetMapping
    fun list(@PathVariable storeId: UUID): List<InventoryResponse> = inventory.forStore(storeId)

    @PostMapping("/{productId}/movements")
    fun adjust(
        @PathVariable storeId: UUID,
        @PathVariable productId: UUID,
        @Valid @RequestBody request: InventoryAdjustmentRequest,
    ): InventoryResponse = inventory.adjust(storeId, productId, request.delta, request.reason)
}
