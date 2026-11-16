package com.syndetis.auth.repository

import com.syndetis.auth.model.entity.OAuthAccount
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface OAuthAccountRepository : JpaRepository<OAuthAccount, UUID> {
    fun findByProviderAndProviderSubject(provider: String, providerSubject: String): OAuthAccount?
}
