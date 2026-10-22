package com.syndetis.core.repository

import com.syndetis.core.model.entity.StockMovement
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface StockMovementRepository : JpaRepository<StockMovement, UUID>
