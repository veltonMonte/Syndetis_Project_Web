package com.syndetis.core.repository

import com.syndetis.core.model.entity.LayoutConfig
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface LayoutConfigRepository : JpaRepository<LayoutConfig, UUID>
