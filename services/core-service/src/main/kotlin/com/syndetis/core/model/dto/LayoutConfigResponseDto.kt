package com.syndetis.core.model.dto

import com.syndetis.core.model.entity.LayoutConfig
import java.time.Instant
import java.util.UUID

data class LayoutConfigResponseDto(
    val storeId: UUID,
    val config: Map<String, Any>,
    val version: Long,
    val updatedAt: Instant
) {
    companion object {
        fun fromEntity(layout: LayoutConfig): LayoutConfigResponseDto {
            return LayoutConfigResponseDto(
                storeId = layout.storeId!!,
                config = layout.config,
                version = layout.version,
                updatedAt = layout.updatedAt
            )
        }
    }
}
