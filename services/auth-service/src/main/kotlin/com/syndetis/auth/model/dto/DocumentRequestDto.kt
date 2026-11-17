package com.syndetis.auth.model.dto

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern

/** A store's CNPJ. Merchant accounts are CNPJ only (a CPF is refused with an explicit message). */
@JsonIgnoreProperties(ignoreUnknown = true)
data class DocumentRequestDto(
    @field:NotBlank(message = "Informe o CNPJ da loja")
    @field:Pattern(regexp = "^[0-9./ -]{11,20}$", message = "Informe o CNPJ da loja com 14 dígitos")
    val document: String,
)
