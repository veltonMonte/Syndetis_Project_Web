package com.syndetis.core.model.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import jakarta.persistence.Version
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "layout_config")
class LayoutConfig {

    @Id
    @Column(name = "store_id", nullable = false)
    var storeId: UUID? = null

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "config", columnDefinition = "jsonb", nullable = false)
    var config: Map<String, Any> = mutableMapOf()

    @Version
    @Column(nullable = false)
    var version: Long = 0

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()

    @PrePersist
    @PreUpdate
    fun updateTimestamp() {
        updatedAt = Instant.now()
    }
}
