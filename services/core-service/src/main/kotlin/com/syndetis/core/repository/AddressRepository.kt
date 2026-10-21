package com.syndetis.core.repository

import com.syndetis.core.model.entity.Address
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface AddressRepository : JpaRepository<Address, UUID> {
    fun findAllByCustomerId(customerId: UUID): List<Address>
    fun findByIdAndCustomerId(id: UUID, customerId: UUID): Address?
}
