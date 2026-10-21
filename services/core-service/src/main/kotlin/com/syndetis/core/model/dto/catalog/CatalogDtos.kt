package com.syndetis.core.model.dto.catalog

import com.syndetis.core.model.entity.Category
import com.syndetis.core.model.entity.Product
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Digits
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.math.BigDecimal
import java.util.UUID

data class CategoryRequest(
    @field:NotBlank @field:Size(max = 120) val name: String,
    @field:Size(min = 2, max = 100)
    @field:Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$")
    val slug: String,
    @field:Min(0) val position: Int = 0,
)

data class CategoryResponse(val id: UUID, val name: String, val slug: String, val position: Int)

data class ProductRequest(
    @field:NotBlank @field:Size(max = 160) val name: String,
    @field:Size(max = 10_000) val description: String? = null,
    @field:DecimalMin("0.00") @field:Digits(integer = 10, fraction = 2) val price: BigDecimal,
    @field:NotBlank @field:Size(max = 100) val sku: String,
    @field:Size(max = 2048) val imageUrl: String? = null,
    val categoryId: UUID? = null,
    val active: Boolean = true,
)

data class ProductResponse(
    val id: UUID,
    val name: String,
    val description: String?,
    val price: BigDecimal,
    val sku: String,
    val imageUrl: String?,
    val categoryId: UUID?,
    val active: Boolean,
)

fun Category.toResponse() = CategoryResponse(id, name, slug, position)
fun Product.toResponse() = ProductResponse(id, name, description, price, sku, imageUrl, categoryId, active)
