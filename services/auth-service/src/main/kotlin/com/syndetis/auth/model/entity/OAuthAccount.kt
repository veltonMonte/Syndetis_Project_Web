package com.syndetis.auth.model.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "oauth_accounts")
class OAuthAccount(
    @Id val id: UUID = UUID.randomUUID(),
    @Column(name = "user_id", nullable = false) val userId: UUID,
    @Column(nullable = false) val provider: String,
    @Column(name = "provider_subject", nullable = false) val providerSubject: String,
)
