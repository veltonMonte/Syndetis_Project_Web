package com.syndetis.core.controller

import com.syndetis.core.model.dto.catalog.CategoryResponse
import com.syndetis.core.model.dto.catalog.ProductResponse
import com.syndetis.core.model.dto.common.PageResponse
import com.syndetis.core.service.CatalogService
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/public/stores/{slug}")
class PublicCatalogController(private val catalog: CatalogService) {
    @GetMapping("/categories")
    fun categories(@PathVariable slug: String): List<CategoryResponse> = catalog.publicCategories(slug)

    @GetMapping("/products")
    fun products(
        @PathVariable slug: String,
        @RequestParam(required = false) category: UUID?,
        @RequestParam(required = false) q: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(defaultValue = "createdAt,desc") sort: String,
    ): PageResponse<ProductResponse> = catalog.publicProducts(slug, category, q, page, size, sort)

    @GetMapping("/products/{productId}")
    fun product(@PathVariable slug: String, @PathVariable productId: UUID): ProductResponse =
        catalog.publicProduct(slug, productId)
}
