package com.syndetis.core.controller

import com.syndetis.core.model.dto.store.PublicStoreResponse
import com.syndetis.core.service.StoreService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/public/stores")
class PublicStoreController(private val stores: StoreService) {
    @GetMapping("/{slug}")
    fun get(@PathVariable slug: String): PublicStoreResponse = stores.publicStore(slug)
}
