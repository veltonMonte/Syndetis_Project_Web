package com.syndetis.core.model.dto.billing

import jakarta.validation.Valid
import jakarta.validation.constraints.*
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class BillingPlan(
    val id: String, val name: String, val priceInCents: Int,
    val activeProductLimit: Int, val structuralEditing: Boolean, val aiDailyRequestLimit: Int,
    val billingCycle: String = "MONTHLY",
)
data class BillingCatalog(val enabled: Boolean, val sandbox: Boolean = true, val currency: String = "BRL", val plans: List<BillingPlan>)
data class SubscribeRequest(
    @field:Pattern(regexp = "STANDARD|MAKER") val planId: String,
    @field:NotBlank @field:Size(min = 2, max = 100) val name: String,
    @field:Pattern(regexp = "(?:[0-9]{11}|[0-9]{14})") val cpfCnpj: String,
)
data class BillingCreateRequest(val reference: UUID, val name: String, val email: String, val cpfCnpj: String,
    val planName: String, val amount: BigDecimal)
data class BillingPayment(
    @field:Pattern(regexp = "pay_[A-Za-z0-9_-]{1,100}") val id: String,
    @field:Size(min = 1, max = 60) val status: String,
    @field:DecimalMin("0.01") @field:Digits(integer = 10, fraction = 2) val amount: BigDecimal,
    val dueDate: LocalDate,
    @field:Size(max = 2048) val invoiceUrl: String? = null,
)
data class BillingSnapshot(
    val reference: UUID,
    @field:Pattern(regexp = "sub_[A-Za-z0-9_-]{1,100}") val providerId: String,
    @field:Pattern(regexp = "cus_[A-Za-z0-9_-]{1,100}") val customerId: String,
    @field:Pattern(regexp = "ACTIVE|INACTIVE|EXPIRED|DELETED") val providerStatus: String,
    @field:DecimalMin("0.01") val amount: BigDecimal,
    @field:Pattern(regexp = "MONTHLY") val cycle: String,
    val observedAt: Instant,
    @field:Valid @field:Size(max = 10000) val payments: List<BillingPayment>,
)
data class SubscriptionView(
    val enabled: Boolean, val sandbox: Boolean = true, val id: UUID? = null,
    val planId: String? = null, val monthlyPrice: BigDecimal? = null,
    val status: String, val canPublish: Boolean, val paidUntil: Instant? = null,
    val cancelled: Boolean = false, val payments: List<BillingPayment> = emptyList(),
)
