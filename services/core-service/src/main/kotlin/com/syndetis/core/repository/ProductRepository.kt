package com.syndetis.core.repository

import com.syndetis.core.model.entity.Product
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface ProductRepository : JpaRepository<Product, UUID> {
    fun existsByStoreIdAndSku(storeId: UUID, sku: String): Boolean
    fun existsByCategoryId(categoryId: UUID): Boolean

    @Query("""
        SELECT p FROM Product p
        WHERE p.storeId = :storeId
          AND (:activeOnly = false OR p.active = true)
          AND (:categoryId IS NULL OR p.categoryId = :categoryId)
          AND (:query IS NULL OR lower(p.name) LIKE lower(concat('%', :query, '%')))
    """)
    fun search(
        @Param("storeId") storeId: UUID,
        @Param("activeOnly") activeOnly: Boolean,
        @Param("categoryId") categoryId: UUID?,
        @Param("query") query: String?,
        pageable: Pageable,
    ): Page<Product>
}
