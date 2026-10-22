package com.syndetis.auth.model.dto

import com.syndetis.auth.model.enum.Role
import java.util.UUID

data class RegisterResponseDto(
    val id: UUID?,
    val firstName: String,
    val email: String,
    val role: Role
)
