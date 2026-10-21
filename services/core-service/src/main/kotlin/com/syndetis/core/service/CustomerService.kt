package com.syndetis.core.service

import com.syndetis.core.exception.NotFoundException
import com.syndetis.core.model.dto.customer.AddressRequest
import com.syndetis.core.model.dto.customer.AddressResponse
import com.syndetis.core.model.dto.customer.CustomerResponse
import com.syndetis.core.model.dto.customer.UpdateCustomerRequest
import com.syndetis.core.model.dto.customer.toResponse
import com.syndetis.core.model.entity.Address
import com.syndetis.core.model.entity.Customer
import com.syndetis.core.repository.AddressRepository
import com.syndetis.core.repository.CustomerRepository
import com.syndetis.core.security.CurrentUser
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class CustomerService(
    private val customers: CustomerRepository,
    private val addresses: AddressRepository,
    private val currentUser: CurrentUser,
) {
    @Transactional
    fun me(): CustomerResponse = currentCustomer().toResponse()

    @Transactional
    fun update(request: UpdateCustomerRequest): CustomerResponse {
        val customer = currentCustomer()
        customer.name = request.name.trim()
        customer.phone = request.phone?.trim()?.takeIf { it.isNotEmpty() }
        customer.document = request.document?.trim()?.takeIf { it.isNotEmpty() }
        customer.updatedAt = Instant.now()
        return customer.toResponse()
    }

    @Transactional
    fun listAddresses(): List<AddressResponse> = addresses.findAllByCustomerId(currentCustomer().id)
        .map { it.toResponse() }

    @Transactional
    fun getAddress(addressId: UUID): AddressResponse = ownedAddress(addressId, currentCustomer().id).toResponse()

    @Transactional
    fun addAddress(request: AddressRequest): AddressResponse = addresses.save(
        Address(customerId = currentCustomer().id, zipCode = request.zipCode, street = request.street.trim(),
            number = request.number.trim(), complement = request.complement?.trim(), city = request.city.trim(),
            state = request.state),
    ).toResponse()

    @Transactional
    fun updateAddress(addressId: UUID, request: AddressRequest): AddressResponse {
        val address = ownedAddress(addressId, currentCustomer().id)
        address.zipCode = request.zipCode
        address.street = request.street.trim()
        address.number = request.number.trim()
        address.complement = request.complement?.trim()
        address.city = request.city.trim()
        address.state = request.state
        return address.toResponse()
    }

    @Transactional
    fun deleteAddress(addressId: UUID) {
        addresses.delete(ownedAddress(addressId, currentCustomer().id))
    }

    private fun currentCustomer(): Customer {
        val userId = currentUser.id()
        customers.findByUserId(userId)?.let { return it }
        val email = currentUser.email()
        val defaultName = email.substringBefore('@').take(160)
        customers.insertIfAbsent(UUID.randomUUID(), userId, defaultName, email)
        return requireNotNull(customers.findByUserId(userId))
    }

    private fun ownedAddress(addressId: UUID, customerId: UUID): Address =
        addresses.findByIdAndCustomerId(addressId, customerId)
            ?: throw NotFoundException("Endereço não encontrado")
}
