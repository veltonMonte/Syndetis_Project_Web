package com.syndetis.core.controller

import com.syndetis.core.model.dto.catalog.CategoryRequest
import com.syndetis.core.model.dto.catalog.CategoryResponse
import com.syndetis.core.service.CatalogService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
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
@RequestMapping("/api/stores/{storeId}/categories")
class CategoryController(private val catalog: CatalogService) {
    @GetMapping
    fun list(@PathVariable storeId: UUID): List<CategoryResponse> = catalog.sellerCategories(storeId)

    @GetMapping("/{categoryId}")
    fun get(@PathVariable storeId: UUID, @PathVariable categoryId: UUID): CategoryResponse =
        catalog.sellerCategory(storeId, categoryId)

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@PathVariable storeId: UUID, @Valid @RequestBody request: CategoryRequest): CategoryResponse =
        catalog.createCategory(storeId, request)

    @PutMapping("/{categoryId}")
    fun update(@PathVariable storeId: UUID, @PathVariable categoryId: UUID, @Valid @RequestBody request: CategoryRequest): CategoryResponse =
        catalog.updateCategory(storeId, categoryId, request)

    @DeleteMapping("/{categoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable storeId: UUID, @PathVariable categoryId: UUID) = catalog.deleteCategory(storeId, categoryId)
}
