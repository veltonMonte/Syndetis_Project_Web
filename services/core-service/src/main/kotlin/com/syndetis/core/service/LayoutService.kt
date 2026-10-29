package com.syndetis.core.service

import com.syndetis.core.exception.BusinessRuleException
import com.syndetis.core.exception.ConflictException
import com.syndetis.core.exception.NotFoundException
import com.syndetis.core.model.dto.layout.LayoutResponse
import com.syndetis.core.repository.LayoutConfigRepository
import com.syndetis.core.security.StoreAccessGuard
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper
import tools.jackson.databind.JsonNode
import java.time.Instant
import java.util.UUID

@Service
class LayoutService(
    private val layouts: LayoutConfigRepository,
    private val access: StoreAccessGuard,
    private val validator: LayoutValidator,
    private val mapper: ObjectMapper,
    private val billing: BillingAccess,
    private val planRules: StorePlanRules,
    private val planPolicy: LayoutPlanPolicy,
) {
    @Transactional(readOnly = true)
    fun get(storeId: UUID): LayoutResponse {
        access.forRead(storeId)
        val layout = find(storeId)
        return LayoutResponse(mapper.readTree(layout.draft), layout.version)
    }

    @Transactional
    fun update(storeId: UUID, expectedVersion: Long, draft: JsonNode): LayoutResponse {
        access.forManage(storeId)
        planRules.lockCatalog(storeId)
        val layout = find(storeId)
        requireVersion(layout.version, expectedVersion)
        val serialized = validator.validateAndSerialize(draft)
        planPolicy.requireAllowed(draft, planRules.resolve(storeId).structuralEditing)
        layout.draft = serialized
        layout.updatedAt = Instant.now()
        layouts.flush()
        return LayoutResponse(mapper.readTree(layout.draft), layout.version)
    }

    @Transactional
    fun publish(storeId: UUID, expectedVersion: Long): LayoutResponse {
        access.forManage(storeId)
        planRules.lockCatalog(storeId)
        billing.requirePaid(storeId)
        val layout = find(storeId)
        requireVersion(layout.version, expectedVersion)
        planRules.requirePublishCapacity(storeId)
        planPolicy.requireAllowed(mapper.readTree(layout.draft), planRules.resolve(storeId).structuralEditing)
        layout.published = layout.draft
        layout.updatedAt = Instant.now()
        layouts.flush()
        return LayoutResponse(mapper.readTree(layout.published), layout.version)
    }

    fun parseVersion(ifMatch: String): Long =
        Regex("^\"([0-9]+)\"$").matchEntire(ifMatch)?.groupValues?.get(1)?.toLongOrNull()
            ?: throw BusinessRuleException("If-Match deve conter a versão entre aspas")

    private fun find(storeId: UUID) = layouts.findById(storeId)
        .orElseThrow { NotFoundException("Layout não encontrado") }

    private fun requireVersion(actual: Long, expected: Long) {
        if (actual != expected) throw ConflictException("O layout foi alterado por outro editor")
    }
}
