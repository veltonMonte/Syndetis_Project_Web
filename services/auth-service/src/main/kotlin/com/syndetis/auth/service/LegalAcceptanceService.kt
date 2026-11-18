package com.syndetis.auth.service

import com.syndetis.auth.exception.OutdatedLegalVersionException
import com.syndetis.auth.model.dto.LegalAcceptanceRequestDto
import com.syndetis.auth.model.dto.LegalStatusDto
import com.syndetis.auth.model.dto.LegalVersionsDto
import com.syndetis.auth.model.entity.LegalAcceptance
import com.syndetis.auth.model.enum.LegalAcceptanceOrigin
import com.syndetis.auth.repository.LegalAcceptanceRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * Records that a merchant accepted the Terms of Use and took notice of the Privacy Policy (docs/legal/README.md).
 * Only the versions in force can be accepted: a page left open on an older text is asked to reload.
 */
@Service
class LegalAcceptanceService(
    private val acceptances: LegalAcceptanceRepository,
    @Value("\${auth.legal.terms-version}") private val termsVersion: String,
    @Value("\${auth.legal.privacy-version}") private val privacyVersion: String,
) {
    fun current() = LegalVersionsDto(termsVersion = termsVersion, privacyVersion = privacyVersion)

    fun requireCurrent(request: LegalAcceptanceRequestDto) {
        if (request.termsVersion.trim() != termsVersion || request.privacyVersion.trim() != privacyVersion) {
            throw OutdatedLegalVersionException()
        }
    }

    @Transactional
    fun record(userId: UUID, request: LegalAcceptanceRequestDto, origin: LegalAcceptanceOrigin): LegalStatusDto {
        requireCurrent(request)
        // Accepting the versions already on record (a double click, two tabs) keeps the first record.
        if (status(userId).pending) {
            acceptances.saveAndFlush(
                LegalAcceptance(userId = userId, termsVersion = termsVersion, privacyVersion = privacyVersion, origin = origin),
            )
        }
        return status(userId)
    }

    fun status(userId: UUID): LegalStatusDto {
        val latest = acceptances.findFirstByUserIdOrderByAcceptedAtDesc(userId)
        return LegalStatusDto(
            termsVersion = termsVersion,
            privacyVersion = privacyVersion,
            acceptedTermsVersion = latest?.termsVersion,
            acceptedPrivacyVersion = latest?.privacyVersion,
            acceptedAt = latest?.acceptedAt,
            pending = latest == null || latest.termsVersion != termsVersion || latest.privacyVersion != privacyVersion,
        )
    }
}
