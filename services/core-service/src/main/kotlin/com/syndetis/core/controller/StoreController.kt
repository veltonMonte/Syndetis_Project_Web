package com.syndetis.core.controller

import com.syndetis.core.model.dto.CreateStoreRequestDto
import com.syndetis.core.model.dto.StoreResponseDto
import com.syndetis.core.security.SecurityUtils
import com.syndetis.core.service.StoreService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

import com.syndetis.core.model.dto.LayoutConfigResponseDto
import com.syndetis.core.model.dto.UpdateLayoutRequestDto
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import java.util.UUID

@RestController
@RequestMapping("/api/stores")
class StoreController(
    val storeService: StoreService
) {
    @PostMapping
    fun createStore(@Valid @RequestBody dto: CreateStoreRequestDto): ResponseEntity<StoreResponseDto> {
        val currentUserId = SecurityUtils.currentUserId()
        val createdStore = storeService.createStore(currentUserId, dto)
        return ResponseEntity.status(HttpStatus.CREATED).body(createdStore)
    }

    @GetMapping("/me")
    fun getMyStores(): ResponseEntity<List<StoreResponseDto>> {
        val currentUserId = SecurityUtils.currentUserId()
        val stores = storeService.findAllByOwner(currentUserId)
        return ResponseEntity.ok(stores)
    }

    @GetMapping("/{storeId}/layout")
    fun getStoreLayout(@PathVariable storeId: UUID): ResponseEntity<LayoutConfigResponseDto> {
        val layout = storeService.getLayout(storeId)
        return ResponseEntity.ok(layout)
    }

    @PutMapping("/{storeId}/layout")
    fun updateStoreLayout(
        @PathVariable storeId: UUID,
        @Valid @RequestBody dto: UpdateLayoutRequestDto
    ): ResponseEntity<LayoutConfigResponseDto> {
        val currentUserId = SecurityUtils.currentUserId()
        val updated = storeService.updateLayout(storeId, currentUserId, dto)
        return ResponseEntity.ok(updated)
    }
}
