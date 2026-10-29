package com.syndetis.core.model.dto.billing

import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class ProductAllowance(val limit: Int, val used: Long, val remaining: Long, val overLimit: Boolean)
data class AiAllowance(val limit: Int, val used: Int, val remaining: Int, val date: LocalDate,
    val resetsAt: Instant, val timezone: String = "America/Sao_Paulo")
data class StoreCapabilities(
    val editContent: Boolean = true, val editFonts: Boolean = true, val editColors: Boolean = true,
    val editBranding: Boolean = true, val structuralEditing: Boolean, val ai: Boolean,
)
data class StoreEntitlements(
    val storeId: UUID, val planId: String, val enforced: Boolean, val paid: Boolean,
    val capabilities: StoreCapabilities, val products: ProductAllowance, val ai: AiAllowance,
    val availableTemplates: List<String>, val layoutAdaptationRequired: Boolean, val canRepublish: Boolean,
)

enum class AiOperation { LAYOUT_EDIT, IMAGE_GENERATION }
enum class AiRequestState { RESERVED, COMPLETED, FAILED }
data class AiReservation(val requestId: UUID, val operation: AiOperation, val state: AiRequestState,
    val quotaDate: LocalDate, val expiresAt: Instant, val acquired: Boolean = false)
