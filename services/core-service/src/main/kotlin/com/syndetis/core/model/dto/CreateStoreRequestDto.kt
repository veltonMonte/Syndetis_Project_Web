package com.syndetis.core.model.dto

import com.syndetis.core.model.enum.StoreType
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

class CreateStoreRequestDto(
    @field:NotBlank(message = "Name is required")
    @field:Size(min = 3, max = 100, message = "Name must be between 3 and 100 characters")
    val name: String,

    @field:NotBlank(message = "Slug is required")
    @field:Size(min = 3, max = 100, message = "Slug must be between 3 and 100 characters")
    @field:Pattern(
        regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        message = "O slug deve conter apenas letras minúsculas, números e hífens (ex: minha-loja)"
    )
    val slug: String,

    @field:NotNull(message = "O tipo da loja é obrigatório")
    val type: StoreType = StoreType.ECOMMERCE

) {
}
