package com.syndetis.core.repository

import com.syndetis.core.model.entity.Category
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface CategoryRepository : JpaRepository<Category, UUID> {
    fun findAllByStoreIdOrderByPositionAscNameAsc(storeId: UUID): List<Category>
    fun existsByStoreIdAndSlug(storeId: UUID, slug: String): Boolean
}
