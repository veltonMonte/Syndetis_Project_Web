package com.syndetis.auth.repository

import com.syndetis.auth.model.entity.OAuthLoginCode
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface OAuthLoginCodeRepository : JpaRepository<OAuthLoginCode, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT code FROM OAuthLoginCode code WHERE code.codeHash = :hash")
    fun lockByHash(@Param("hash") hash: String): OAuthLoginCode?
}
