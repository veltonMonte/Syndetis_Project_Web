package com.syndetis.auth.model.dto

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import com.syndetis.auth.security.BcryptLength

/**
 * DTO de entrada para o cadastro público de usuários.
 *
 * Propriedades não reconhecidas enviadas pelo cliente (como 'role') são
 * ignoradas na desserialização, e o perfil Role.CUSTOMER é atribuído
 * exclusivamente pelo servidor. Criação de SELLER e ADMIN exige fluxos separados.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
data class RegisterRequestDto(
    @field:NotBlank(message = "O primeiro nome é obrigatório")
    val firstName: String,

    @field:NotBlank(message = "O e-mail é obrigatório")
    @field:Email(message = "E-mail inválido")
    val email: String,

    @field:NotBlank(message = "A senha é obrigatória")
    @field:Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres")
    @field:BcryptLength
    val password: String
)

