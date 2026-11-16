package com.syndetis.core.controller

import com.syndetis.core.model.dto.customer.AddressRequest
import com.syndetis.core.model.dto.customer.AddressResponse
import com.syndetis.core.model.dto.customer.CustomerResponse
import com.syndetis.core.model.dto.customer.UpdateCustomerRequest
import com.syndetis.core.service.CustomerService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/api/customers/me")
class CustomerController(private val customers: CustomerService) {
    @GetMapping
    fun me(): CustomerResponse = customers.me()

    @PutMapping
    fun update(@Valid @RequestBody request: UpdateCustomerRequest): CustomerResponse = customers.update(request)

    @GetMapping("/addresses")
    fun addresses(): List<AddressResponse> = customers.listAddresses()

    @GetMapping("/addresses/{addressId}")
    fun address(@PathVariable addressId: UUID): AddressResponse = customers.getAddress(addressId)

    @PostMapping("/addresses")
    @ResponseStatus(HttpStatus.CREATED)
    fun addAddress(@Valid @RequestBody request: AddressRequest): AddressResponse = customers.addAddress(request)

    @PutMapping("/addresses/{addressId}")
    fun updateAddress(@PathVariable addressId: UUID, @Valid @RequestBody request: AddressRequest): AddressResponse =
        customers.updateAddress(addressId, request)

    @DeleteMapping("/addresses/{addressId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteAddress(@PathVariable addressId: UUID) = customers.deleteAddress(addressId)
}
