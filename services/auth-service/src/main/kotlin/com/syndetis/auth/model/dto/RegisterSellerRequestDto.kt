package com.syndetis.auth.model.dto

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.syndetis.auth.security.BcryptLength
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

/** Merchant signup: the account fields plus the store's CNPJ, which the Receita Federal must confirm as active. */
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

    @field:NotBlank(message = "Informe o CNPJ da loja")
    @field:Pattern(regexp = "^[0-9./ -]{11,20}$", message = "Informe o CNPJ da loja com 14 dígitos")
    val document: String,
) {
    fun account() = RegisterRequestDto(firstName = firstName, email = email, password = password)
    fun document() = DocumentRequestDto(document = document)
}
