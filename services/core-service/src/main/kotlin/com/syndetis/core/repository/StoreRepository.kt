package com.syndetis.core.repository

import com.syndetis.core.model.entity.Store
import com.syndetis.core.model.enum.StoreStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface StoreRepository : JpaRepository<Store, UUID> {
    fun findBySlug(slug: String): Store?
    fun existsBySlug(slug: String): Boolean
    fun findAllByOwnerUserId(ownerUserId: UUID): List<Store>
}
