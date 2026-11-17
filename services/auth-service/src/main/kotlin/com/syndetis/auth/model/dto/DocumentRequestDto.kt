package com.syndetis.auth.model.dto

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import java.time.LocalDate

/** A merchant's CPF (with the holder's date of birth, as the Receita Federal asks) or CNPJ. */
@JsonIgnoreProperties(ignoreUnknown = true)
data class DocumentRequestDto(
    @field:NotBlank(message = "Informe o CPF ou o CNPJ")
    @field:Pattern(regexp = "^[0-9./ -]{11,20}$", message = "Informe um CPF ou CNPJ com 11 ou 14 dígitos")
    val document: String,

    val birthDate: LocalDate? = null,
)
