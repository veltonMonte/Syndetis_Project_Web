package com.syndetis.core.model.dto.store

import com.syndetis.core.model.entity.Store
import com.syndetis.core.model.entity.StoreStatus
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.Digits
import java.math.BigDecimal
import tools.jackson.databind.JsonNode
import java.time.Instant
import java.util.UUID

data class CreateStoreRequest(
    @field:NotBlank @field:Size(max = 160)
    val name: String,
    @field:Size(min = 3, max = 100)
    @field:Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$")
    val slug: String,
    @field:DecimalMin("0.00") @field:Digits(integer = 10, fraction = 2)
    val shippingFee: BigDecimal = BigDecimal.ZERO.setScale(2),
    @field:NotBlank @field:Size(max = 1000)
    val deliveryInstructions: String = "Entrega a combinar com o vendedor.",
)

data class UpdateStoreRequest(
    @field:NotBlank @field:Size(max = 160)
    val name: String,
    val status: StoreStatus,
    @field:DecimalMin("0.00") @field:Digits(integer = 10, fraction = 2)
    val shippingFee: BigDecimal = BigDecimal.ZERO.setScale(2),
    @field:NotBlank @field:Size(max = 1000)
    val deliveryInstructions: String = "Entrega a combinar com o vendedor.",
)

data class StoreResponse(
    val id: UUID,
    val name: String,
    val slug: String,
    val status: StoreStatus,
    val createdAt: Instant,
    val shippingFee: BigDecimal,
    val deliveryInstructions: String,
)

data class PublicStoreResponse(
    val id: UUID,
    val name: String,
    val slug: String,
    val layout: JsonNode,
    val shippingFee: BigDecimal,
    val deliveryInstructions: String,
)

fun Store.toResponse() = StoreResponse(id, name, slug, status, createdAt, shippingFee, deliveryInstructions)
