package com.syndetis.auth.model.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.Instant

/** The versions of the Terms of Use and the Privacy Policy the merchant read and accepted. */
data class LegalAcceptanceRequestDto(
    @field:NotBlank(message = "Informe a versão dos Termos de Uso aceita")
    @field:Size(max = 20)
    val termsVersion: String,

    @field:NotBlank(message = "Informe a versão da Política de Privacidade")
    @field:Size(max = 20)
    val privacyVersion: String,
)

/** The versions in force today. */
data class LegalVersionsDto(
    val termsVersion: String,
    val privacyVersion: String,
)

/** What the signed-in account accepted, and whether it still has to accept the versions in force. */
data class LegalStatusDto(
    val termsVersion: String,
    val privacyVersion: String,
    val acceptedTermsVersion: String?,
    val acceptedPrivacyVersion: String?,
    val acceptedAt: Instant?,
    val pending: Boolean,
)
