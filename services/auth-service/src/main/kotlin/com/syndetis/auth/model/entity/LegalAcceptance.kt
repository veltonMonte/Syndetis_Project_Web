package com.syndetis.auth.model.entity

import com.syndetis.auth.model.enum.LegalAcceptanceOrigin
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/** One acceptance of the Terms of Use and the Privacy Policy, at the versions the merchant saw. */
@Entity
@Table(name = "legal_acceptances")
class LegalAcceptance(
    @Id
    val id: UUID = UUID.randomUUID(),
    @Column(name = "user_id", nullable = false)
    val userId: UUID,
    @Column(name = "terms_version", nullable = false, length = 20)
    val termsVersion: String,
    @Column(name = "privacy_version", nullable = false, length = 20)
    val privacyVersion: String,
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    val origin: LegalAcceptanceOrigin,
    @Column(name = "accepted_at", nullable = false)
    val acceptedAt: Instant = Instant.now(),
)
