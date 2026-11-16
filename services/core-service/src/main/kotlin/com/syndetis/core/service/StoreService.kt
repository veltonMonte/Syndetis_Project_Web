package com.syndetis.core.service

import com.syndetis.core.exception.ConflictException
import com.syndetis.core.exception.NotFoundException
import com.syndetis.core.model.dto.store.CreateStoreRequest
import com.syndetis.core.model.dto.store.PublicStoreResponse
import com.syndetis.core.model.dto.store.StoreResponse
import com.syndetis.core.model.dto.store.UpdateStoreRequest
import com.syndetis.core.model.dto.store.toResponse
import com.syndetis.core.model.entity.LayoutConfig
import com.syndetis.core.model.entity.Store
import com.syndetis.core.model.entity.StoreStatus
import com.syndetis.core.repository.LayoutConfigRepository
import com.syndetis.core.repository.StoreRepository
import com.syndetis.core.security.CurrentUser
import com.syndetis.core.security.StoreAccessGuard
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper
import java.time.Instant
import java.util.UUID

@Service
class StoreService(
    private val stores: StoreRepository,
    private val layouts: LayoutConfigRepository,
    private val currentUser: CurrentUser,
    private val access: StoreAccessGuard,
    private val mapper: ObjectMapper,
    private val billing: BillingAccess,
) {
    private val defaultLayout: String by lazy {
        requireNotNull(javaClass.getResourceAsStream("/layout-templates/ecommerce.json"))
            .bufferedReader().use { it.readText() }
    }

    @Transactional
    fun create(request: CreateStoreRequest): StoreResponse {
        if (stores.existsBySlug(request.slug)) throw ConflictException("Slug já está em uso")
        val store = stores.save(Store(ownerUserId = currentUser.id(), name = request.name.trim(), slug = request.slug,
            shippingFee = request.shippingFee, deliveryInstructions = request.deliveryInstructions.trim()))
        layouts.save(LayoutConfig(storeId = store.id, draft = defaultLayout, published = defaultLayout))
        return store.toResponse()
    }

    @Transactional(readOnly = true)
    fun mine(): List<StoreResponse> = stores.findAllByOwnerUserIdOrderByCreatedAtDesc(currentUser.id())
        .map { it.toResponse() }

    @Transactional(readOnly = true)
    fun get(storeId: UUID): StoreResponse = access.forRead(storeId).toResponse()

    @Transactional
    fun update(storeId: UUID, request: UpdateStoreRequest): StoreResponse {
        val store = access.forManage(storeId)
        store.name = request.name.trim()
        store.status = request.status
        store.shippingFee = request.shippingFee
        store.deliveryInstructions = request.deliveryInstructions.trim()
        store.updatedAt = Instant.now()
        return store.toResponse()
    }

    @Transactional(readOnly = true)
    fun publicStore(slug: String): PublicStoreResponse {
        val store = stores.findBySlug(slug)
            ?.takeIf { it.status == StoreStatus.ACTIVE }
            ?: throw NotFoundException("Loja não encontrada")
        val published = layouts.findById(store.id)
            .orElseThrow { NotFoundException("Layout não encontrado") }
            .published
        billing.requirePublic(store.id)
        return PublicStoreResponse(store.id, store.name, store.slug, mapper.readTree(published),
            store.shippingFee, store.deliveryInstructions)
    }
}
