package com.syndetis.core.repository

import com.syndetis.core.model.entity.Store
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface StoreRepository : JpaRepository<Store, UUID> {
    fun findBySlug(slug: String): Store?
    fun findAllByOwnerUserIdOrderByCreatedAtDesc(ownerUserId: UUID): List<Store>
    fun existsBySlug(slug: String): Boolean
}
