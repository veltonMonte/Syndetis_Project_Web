package com.syndetis.core.controller

import com.syndetis.core.model.dto.catalog.ProductRequest
import com.syndetis.core.model.dto.catalog.ProductResponse
import com.syndetis.core.model.dto.common.PageResponse
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
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/stores/{storeId}/products")
class ProductController(private val catalog: CatalogService) {
    @GetMapping
    fun list(
        @PathVariable storeId: UUID,
        @RequestParam(required = false) category: UUID?,
        @RequestParam(required = false) q: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(defaultValue = "createdAt,desc") sort: String,
    ): PageResponse<ProductResponse> = catalog.sellerProducts(storeId, category, q, page, size, sort)

    @GetMapping("/{productId}")
    fun get(@PathVariable storeId: UUID, @PathVariable productId: UUID): ProductResponse =
        catalog.sellerProduct(storeId, productId)

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@PathVariable storeId: UUID, @Valid @RequestBody request: ProductRequest): ProductResponse =
        catalog.createProduct(storeId, request)

    @PutMapping("/{productId}")
    fun update(@PathVariable storeId: UUID, @PathVariable productId: UUID, @Valid @RequestBody request: ProductRequest): ProductResponse =
        catalog.updateProduct(storeId, productId, request)

    @DeleteMapping("/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable storeId: UUID, @PathVariable productId: UUID) = catalog.deleteProduct(storeId, productId)
}
