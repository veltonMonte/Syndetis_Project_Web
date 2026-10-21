package com.syndetis.core.repository

import com.syndetis.core.model.entity.Product
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

interface ProductRepository : JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {
    fun existsByStoreIdAndSku(storeId: UUID, sku: String): Boolean
    fun existsByCategoryId(categoryId: UUID): Boolean
}
