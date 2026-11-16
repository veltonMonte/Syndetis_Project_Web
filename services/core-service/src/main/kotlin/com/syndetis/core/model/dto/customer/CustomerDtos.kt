package com.syndetis.core.model.dto.customer

import com.syndetis.core.model.entity.Address
import com.syndetis.core.model.entity.Customer
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import java.util.UUID

data class UpdateCustomerRequest(
    @field:NotBlank @field:Size(max = 160) val name: String,
    @field:Size(max = 30) val phone: String? = null,
    @field:Size(max = 32) val document: String? = null,
)

data class CustomerResponse(
    val id: UUID,
    val name: String,
    val email: String,
    val phone: String?,
    val document: String?,
)

data class AddressRequest(
    @field:Pattern(regexp = "^[0-9]{8}$") val zipCode: String,
    @field:NotBlank @field:Size(max = 160) val street: String,
    @field:NotBlank @field:Size(max = 30) val number: String,
    @field:Size(max = 160) val complement: String? = null,
    @field:NotBlank @field:Size(max = 120) val city: String,
    @field:Pattern(regexp = "^[A-Z]{2}$") val state: String,
)

data class AddressResponse(
    val id: UUID,
    val zipCode: String,
    val street: String,
    val number: String,
    val complement: String?,
    val city: String,
    val state: String,
)

fun Customer.toResponse() = CustomerResponse(id, name, email, phone, document)
fun Address.toResponse() = AddressResponse(id, zipCode, street, number, complement, city, state)
