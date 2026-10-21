package com.syndetis.core.controller

import com.syndetis.core.model.dto.store.CreateStoreRequest
import com.syndetis.core.model.dto.store.StoreResponse
import com.syndetis.core.model.dto.store.UpdateStoreRequest
import com.syndetis.core.service.StoreService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/stores")
class StoreController(private val stores: StoreService) {
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@Valid @RequestBody request: CreateStoreRequest): StoreResponse = stores.create(request)

    @GetMapping("/me")
    fun mine(): List<StoreResponse> = stores.mine()

    @GetMapping("/{storeId}")
    fun get(@PathVariable storeId: UUID): StoreResponse = stores.get(storeId)

    @PutMapping("/{storeId}")
    fun update(@PathVariable storeId: UUID, @Valid @RequestBody request: UpdateStoreRequest): StoreResponse =
        stores.update(storeId, request)
}
