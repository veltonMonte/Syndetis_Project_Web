package com.syndetis.core.model.dto

import com.syndetis.core.model.entity.Store
import com.syndetis.core.model.enum.StoreStatus
import com.syndetis.core.model.enum.StoreType
import java.time.Instant
import java.util.UUID

class StoreResponseDto(
    val id: UUID,
    val ownerUserId: UUID,
    val name: String,
    val slug: String,
    val type: StoreType,
    val status: StoreStatus,
    val createdAt: Instant,
    val updatedAt: Instant
) {
    companion object {
        fun fromEntity(store: Store): StoreResponseDto {
            return StoreResponseDto(
                id = store.id!!,
                ownerUserId = store.ownerUserId!!,
                name = store.name!!,
                slug = store.slug!!,
                type = store.type,
                status = store.status,
                createdAt = store.createdAt,
                updatedAt = store.updatedAt
            )
        }
    }
}
