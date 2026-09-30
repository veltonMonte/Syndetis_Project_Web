package com.seuprojeto.auth.model.dto

import com.seuprojeto.auth.model.enum.Role
import java.util.UUID

data class RegisterResponseDto(
    val id: UUID?,
    val firstName: String,
    val email: String,
    val role: Role
)
