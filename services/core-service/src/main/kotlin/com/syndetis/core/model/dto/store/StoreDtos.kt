package com.syndetis.core.model.dto.store

import com.syndetis.core.model.entity.Store
import com.syndetis.core.model.entity.StoreStatus
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import tools.jackson.databind.JsonNode
import java.time.Instant
import java.util.UUID

data class CreateStoreRequest(
    @field:NotBlank @field:Size(max = 160)
    val name: String,
    @field:Size(min = 3, max = 100)
    @field:Pattern(regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$")
    val slug: String,
)

data class UpdateStoreRequest(
    @field:NotBlank @field:Size(max = 160)
    val name: String,
    val status: StoreStatus,
)

data class StoreResponse(
    val id: UUID,
    val name: String,
    val slug: String,
    val status: StoreStatus,
    val createdAt: Instant,
)

data class PublicStoreResponse(
    val id: UUID,
    val name: String,
    val slug: String,
    val layout: JsonNode,
)

fun Store.toResponse() = StoreResponse(id, name, slug, status, createdAt)
