package com.syndetis.core.repository

import com.syndetis.core.model.entity.LayoutConfig
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface LayoutConfigRepository : JpaRepository<LayoutConfig, UUID>
