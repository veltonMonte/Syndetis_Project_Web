package com.syndetis.auth.repository

import com.syndetis.auth.model.entity.LegalAcceptance
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface LegalAcceptanceRepository : JpaRepository<LegalAcceptance, UUID> {
    fun findFirstByUserIdOrderByAcceptedAtDesc(userId: UUID): LegalAcceptance?
}
