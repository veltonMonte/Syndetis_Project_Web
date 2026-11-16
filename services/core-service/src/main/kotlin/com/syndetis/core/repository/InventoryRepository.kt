package com.syndetis.core.repository

import com.syndetis.core.model.entity.Inventory
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface InventoryRepository : JpaRepository<Inventory, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Inventory i WHERE i.productId = :productId")
    fun lockByProductId(@Param("productId") productId: UUID): Inventory?

    @Query(value = "SELECT i.* FROM inventory i JOIN products p ON p.id = i.product_id WHERE p.store_id = :storeId ORDER BY p.name, p.id", nativeQuery = true)
    fun findForStore(@Param("storeId") storeId: UUID): List<Inventory>
}
