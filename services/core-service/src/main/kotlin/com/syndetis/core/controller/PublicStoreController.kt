package com.syndetis.core.controller

import com.syndetis.core.model.dto.LayoutConfigResponseDto
import com.syndetis.core.model.dto.StoreResponseDto
import com.syndetis.core.service.StoreService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/public/stores")
class PublicStoreController(
    private val storeService: StoreService
) {

    @GetMapping("/{slug}")
    fun getStoreBySlug(@PathVariable slug: String): ResponseEntity<StoreResponseDto> {
        val store = storeService.findBySlug(slug)
        return ResponseEntity.ok(store)
    }

    @GetMapping("/{slug}/layout")
    fun getStoreLayoutBySlug(@PathVariable slug: String): ResponseEntity<LayoutConfigResponseDto> {
        val layout = storeService.getLayoutBySlug(slug)
        return ResponseEntity.ok(layout)
    }
}
