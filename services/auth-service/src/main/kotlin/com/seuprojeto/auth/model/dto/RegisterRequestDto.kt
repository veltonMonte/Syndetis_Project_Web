package com.seuprojeto.auth.model.dto

import com.seuprojeto.auth.model.enum.Role
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank

data class RegisterRequestDto(
    @field:NotBlank(message = "O primeiro nome é obrigatório")
    val firstName: String,

    @field:NotBlank(message = "O e-mail é obrigatório")
    @field:Email(message = "E-mail inválido")
    val email: String,

    @field:NotBlank(message = "A senha é obrigatória")
    val password: String,

    val role: Role = Role.CUSTOMER
)

