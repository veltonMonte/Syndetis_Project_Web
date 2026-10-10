package com.syndetis.core.model.dto

import jakarta.validation.constraints.NotEmpty

data class UpdateLayoutRequestDto(
    @field:NotEmpty(message = "A configuração do layout não pode estar vazia")
    val config: Map<String, Any>,

    val version: Long? = null
)
