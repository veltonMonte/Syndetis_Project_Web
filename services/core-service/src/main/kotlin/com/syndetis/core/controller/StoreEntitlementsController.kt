package com.syndetis.core.controller

import com.syndetis.core.service.StoreEntitlementsService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
class StoreEntitlementsController(private val entitlements: StoreEntitlementsService) {
    @GetMapping("/api/stores/{storeId}/entitlements")
    fun get(@PathVariable storeId: UUID) = entitlements.get(storeId)
}
