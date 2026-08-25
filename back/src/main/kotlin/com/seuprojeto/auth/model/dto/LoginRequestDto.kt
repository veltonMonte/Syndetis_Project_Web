package com.seuprojeto.auth.model.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank

data class LoginRequestDto(
    @field:NotBlank(message = "O e-mail é obrigatório")
    @field:Email(message = "E-mail inválido")
    val email: String,
    @field:NotBlank(message = "A senha é obrigatória")
    val password: String
)