package com.syndetis.core.service

import com.syndetis.core.exception.LayoutConfigNotFoundException
import com.syndetis.core.exception.SlugAlreadyExistsException
import com.syndetis.core.exception.StoreAccessDeniedException
import com.syndetis.core.exception.StoreNotFoundException
import com.syndetis.core.model.dto.CreateStoreRequestDto
import com.syndetis.core.model.dto.LayoutConfigResponseDto
import com.syndetis.core.model.dto.StoreResponseDto
import com.syndetis.core.model.dto.UpdateLayoutRequestDto
import com.syndetis.core.model.entity.DefaultLayoutTemplate
import com.syndetis.core.model.entity.LayoutConfig
import com.syndetis.core.model.entity.Store
import com.syndetis.core.model.enum.StoreStatus
import com.syndetis.core.model.enum.StoreType
import com.syndetis.core.repository.LayoutConfigRepository
import com.syndetis.core.repository.StoreRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class StoreService(
    private val storeRepository: StoreRepository,
    private val layoutConfigRepository: LayoutConfigRepository
) {

    @Transactional
    fun createStore(ownerId: UUID, dto: CreateStoreRequestDto): StoreResponseDto {
        val normalizedSlug = dto.slug.trim().lowercase()

        if (storeRepository.existsBySlug(normalizedSlug)) {
            throw SlugAlreadyExistsException("Store $normalizedSlug already exists")
        }

        val store = Store().apply {
            this.ownerUserId = ownerId
            this.name = dto.name.trim()
            this.slug = normalizedSlug
            this.type = dto.type
            this.status = StoreStatus.ACTIVE
        }

        val savedStore = storeRepository.save(store)

        // Inicializa o layout da Sessão Maker com os componentes e temas de fábrica
        val initialLayout = LayoutConfig().apply {
            this.storeId = savedStore.id
            this.config = DefaultLayoutTemplate.createDefault()
        }
        layoutConfigRepository.save(initialLayout)

        return StoreResponseDto.fromEntity(savedStore)
    }

    @Transactional(readOnly = true)
    fun findBySlug(slug: String): StoreResponseDto {
        val store = storeRepository.findBySlug(slug.trim().lowercase())
            ?: throw StoreNotFoundException("Loja com slug '$slug' não encontrada")
        return StoreResponseDto.fromEntity(store)
    }

    @Transactional(readOnly = true)
    fun findAllByOwner(ownerId: UUID): List<StoreResponseDto> {
        return storeRepository.findAllByOwnerUserId(ownerId)
            .map { StoreResponseDto.fromEntity(it) }
    }

    @Transactional(readOnly = true)
    fun getLayout(storeId: UUID): LayoutConfigResponseDto {
        val layout = layoutConfigRepository.findById(storeId)
            .orElseThrow { LayoutConfigNotFoundException("Layout não encontrado para a loja informada") }
        return LayoutConfigResponseDto.fromEntity(layout)
    }

    @Transactional(readOnly = true)
    fun getLayoutBySlug(slug: String): LayoutConfigResponseDto {
        val store = storeRepository.findBySlug(slug.trim().lowercase())
            ?: throw StoreNotFoundException("Loja com slug '$slug' não encontrada")
        val layout = layoutConfigRepository.findById(store.id!!)
            .orElseThrow { LayoutConfigNotFoundException("Layout não encontrado para a loja informada") }
        return LayoutConfigResponseDto.fromEntity(layout)
    }

    @Transactional
    fun updateLayout(storeId: UUID, requesterUserId: UUID, dto: UpdateLayoutRequestDto): LayoutConfigResponseDto {
        val store = storeRepository.findById(storeId)
            .orElseThrow { StoreNotFoundException("Loja não encontrada") }

        if (store.ownerUserId != requesterUserId) {
            throw StoreAccessDeniedException("Você não tem permissão para alterar o layout desta loja")
        }

        val layout = layoutConfigRepository.findById(storeId)
            .orElseThrow { LayoutConfigNotFoundException("Layout não encontrado para a loja") }

        layout.config = dto.config
        val updated = layoutConfigRepository.save(layout)
        return LayoutConfigResponseDto.fromEntity(updated)
    }
}
