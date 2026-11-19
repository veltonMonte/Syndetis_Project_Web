package com.syndetis.auth.model.dto

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.syndetis.auth.security.BcryptLength
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

/**
 * Merchant signup: the account fields and, optionally, the store's CNPJ. When it is sent, the Receita Federal must
 * confirm it as active; a confirmed CNPJ earns the "Verificado Syndetis" badge (ADR 0007).
 */
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

    @field:Pattern(regexp = "^([0-9./ -]{11,20})?$", message = "Informe o CNPJ da loja com 14 dígitos")
    val document: String? = null,
) {
    fun account() = RegisterRequestDto(firstName = firstName, email = email, password = password)
    /** The CNPJ to confirm, or null when the merchant left it empty. */
    fun document() = document?.takeIf { it.isNotBlank() }?.let { DocumentRequestDto(document = it) }
}
