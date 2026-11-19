package com.syndetis.auth.service

import com.syndetis.auth.exception.OutdatedLegalVersionException
import com.syndetis.auth.model.dto.LegalAcceptanceRequestDto
import com.syndetis.auth.model.entity.LegalAcceptance
import com.syndetis.auth.model.enum.LegalAcceptanceOrigin
import com.syndetis.auth.repository.LegalAcceptanceRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.never
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import java.util.UUID

class LegalAcceptanceServiceTest {
    private val userId = UUID.randomUUID()
    private val current = LegalAcceptanceRequestDto(termsVersion = "2026-11-18", privacyVersion = "2026-11-18")
    private lateinit var repository: LegalAcceptanceRepository
    private lateinit var service: LegalAcceptanceService
    private var stored: LegalAcceptance? = null

    @BeforeEach
    fun setUp() {
        stored = null
        repository = mock(LegalAcceptanceRepository::class.java)
        `when`(repository.findFirstByUserIdOrderByAcceptedAtDesc(userId)).thenAnswer { stored }
        `when`(repository.saveAndFlush(any(LegalAcceptance::class.java))).thenAnswer { invocation ->
            invocation.getArgument<LegalAcceptance>(0).also { stored = it }
        }
        service = LegalAcceptanceService(repository, "2026-11-18", "2026-11-18")
    }

    @Test
    fun `an account with no acceptance on record has the versions in force pending`() {
        val status = service.status(userId)
        assertTrue(status.pending)
        assertEquals(null, status.acceptedAt)
        assertEquals("2026-11-18", status.termsVersion)
    }

    @Test
    fun `accepting the versions in force records them once`() {
        val status = service.record(userId, current, LegalAcceptanceOrigin.IN_APP)
        assertFalse(status.pending)
        assertEquals("2026-11-18", status.acceptedTermsVersion)
        assertEquals(LegalAcceptanceOrigin.IN_APP, stored!!.origin)

        // A second click or another tab does not add a second record.
        service.record(userId, current, LegalAcceptanceOrigin.IN_APP)
        verify(repository, times(1)).saveAndFlush(any(LegalAcceptance::class.java))
    }

    @Test
    fun `an older text cannot be accepted`() {
        assertThrows(OutdatedLegalVersionException::class.java) {
            service.record(userId, current.copy(termsVersion = "2026-01-01"), LegalAcceptanceOrigin.SIGNUP)
        }
        assertThrows(OutdatedLegalVersionException::class.java) {
            service.requireCurrent(current.copy(privacyVersion = ""))
        }
        verify(repository, never()).saveAndFlush(any(LegalAcceptance::class.java))
    }

    @Test
    fun `a newer version in force makes an earlier acceptance pending again`() {
        stored = LegalAcceptance(userId = userId, termsVersion = "2026-11-18", privacyVersion = "2026-11-18", origin = LegalAcceptanceOrigin.SIGNUP)
        val updated = LegalAcceptanceService(repository, "2027-02-01", "2026-11-18")
        val status = updated.status(userId)
        assertTrue(status.pending)
        assertEquals("2026-11-18", status.acceptedTermsVersion)
        assertEquals("2027-02-01", status.termsVersion)
    }
}
