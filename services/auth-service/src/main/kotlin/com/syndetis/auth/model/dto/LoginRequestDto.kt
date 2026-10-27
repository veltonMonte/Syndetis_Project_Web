package com.syndetis.auth.model.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import com.syndetis.auth.security.BcryptLength

data class LoginRequestDto(
    @field:NotBlank(message = "O e-mail é obrigatório")
    @field:Email(message = "E-mail inválido")
    val email: String,
    @field:NotBlank(message = "A senha é obrigatória")
    // Não impor novo mínimo no login: contas anteriores podem ter senhas menores.
    @field:Size(max = 72, message = "A senha deve ter no máximo 72 caracteres")
    @field:BcryptLength
    val password: String
)
