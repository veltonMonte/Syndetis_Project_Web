package com.syndetis.auth.repository

import com.syndetis.auth.model.entity.RefreshToken
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.Instant
import java.util.UUID

interface RefreshTokenRepository : JpaRepository<RefreshToken, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT token FROM RefreshToken token WHERE token.tokenHash = :hash")
    fun lockByHash(@Param("hash") hash: String): RefreshToken?

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RefreshToken token SET token.revokedAt = :revokedAt WHERE token.familyId = :familyId AND token.revokedAt IS NULL")
    fun revokeFamily(@Param("familyId") familyId: UUID, @Param("revokedAt") revokedAt: Instant): Int
}
