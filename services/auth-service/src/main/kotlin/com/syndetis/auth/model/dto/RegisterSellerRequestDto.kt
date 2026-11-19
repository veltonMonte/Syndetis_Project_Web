package com.syndetis.auth.model.dto

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.syndetis.auth.security.BcryptLength
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.time.LocalDate

private const val LEGAL_REQUIRED = "Aceite os Termos de Uso e a Política de Privacidade para criar a conta."

/** Merchant signup: the account fields plus the CPF or CNPJ the Receita Federal must confirm. */
@JsonIgnoreProperties(ignoreUnknown = true)
data class RegisterSellerRequestDto(
    @field:NotBlank(message = "O primeiro nome é obrigatório")
    val firstName: String,

    @field:NotBlank(message = "O e-mail é obrigatório")
    @field:Email(message = "E-mail inválido")
    val email: String,

    @field:NotBlank(message = "A senha é obrigatória")
    @field:Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres")
    @field:BcryptLength
    val password: String,

    @field:NotBlank(message = "Informe o CPF ou o CNPJ")
    @field:Pattern(regexp = "^[0-9./ -]{11,20}$", message = "Informe um CPF ou CNPJ com 11 ou 14 dígitos")
    val document: String,

    val birthDate: LocalDate? = null,

    /** The Terms of Use version the merchant accepted with the signup checkbox (docs/legal/README.md). */
    @field:NotBlank(message = LEGAL_REQUIRED)
    val acceptedTermsVersion: String? = null,

    /** The Privacy Policy version shown next to the same checkbox. */
    @field:NotBlank(message = LEGAL_REQUIRED)
    val acceptedPrivacyVersion: String? = null,
) {
    fun legal() = LegalAcceptanceRequestDto(termsVersion = acceptedTermsVersion.orEmpty(), privacyVersion = acceptedPrivacyVersion.orEmpty())
    fun account() = RegisterRequestDto(firstName = firstName, email = email, password = password)
    fun document() = DocumentRequestDto(document = document, birthDate = birthDate)
}
