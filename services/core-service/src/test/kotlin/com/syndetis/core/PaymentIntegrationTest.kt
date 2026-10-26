package com.syndetis.core

import com.syndetis.core.payment.*
import com.syndetis.core.repository.InventoryRepository
import com.syndetis.core.repository.OrderRepository
import com.syndetis.core.service.OrderService
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.testcontainers.service.connection.ServiceConnection
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.Primary
import org.springframework.http.MediaType
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.request.RequestPostProcessor
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer
import tools.jackson.databind.ObjectMapper
import java.time.Instant
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@SpringBootTest(properties = ["core.payments.enabled=true", "core.events.enabled=false",
    "core.payments.internal-token=test-internal-token-at-least-32-characters"])
@AutoConfigureMockMvc
@Testcontainers
@Import(PaymentTestConfig::class)
class PaymentIntegrationTest(
    @Autowired private val mvc: MockMvc,
    @Autowired private val mapper: ObjectMapper,
    @Autowired private val inventory: InventoryRepository,
    @Autowired private val orders: OrderRepository,
    @Autowired private val orderService: OrderService,
    @Autowired private val gateway: RecordingPaymentGateway,
) {
    companion object {
        @Container @ServiceConnection val postgres = PostgreSQLContainer("postgres:16-alpine")
        const val INTERNAL_TOKEN = "test-internal-token-at-least-32-characters"
    }
    private val seller = identity("SELLER")
    private val customer = identity("CUSTOMER")
    private lateinit var storeId: String
    private lateinit var productId: String
    private lateinit var addressId: String
    private lateinit var orderId: String

    @BeforeEach
    fun setup() {
        gateway.calls.clear()
        gateway.payments = emptyList()
        storeId = created("/api/stores", seller, """{"name":"Loja","slug":"test-${UUID.randomUUID()}","shippingFee":7.50,"deliveryInstructions":"Envio pelo vendedor"}""")
        productId = created("/api/stores/$storeId/products", seller, """{"name":"Produto","sku":"test","price":29.90}""")
        assertEquals(200, mvc.perform(post("/api/stores/$storeId/inventory/$productId/movements").with(seller)
            .contentType(MediaType.APPLICATION_JSON).content("""{"delta":2,"reason":"Carga inicial"}""")).andReturn().response.status)
        addressId = created("/api/customers/me/addresses", customer, """{"zipCode":"01001000","street":"Rua A","number":"10","city":"São Paulo","state":"SP"}""")
        orderId = createOrder()
    }

    @Test
    fun `checkout uses server totals and snapshots the private delivery address`() {
        val order = orders.findById(UUID.fromString(orderId)).orElseThrow()
        assertEquals("37.40", order.total.toPlainString())
        assertTrue(requireNotNull(order.deliveryAddress).contains("Rua A, 10"))
        assertEquals("Envio pelo vendedor", order.deliveryInstructions)
        assertEquals(404, mvc.perform(post("/api/orders/$orderId/payment").with(identity("CUSTOMER"))).andReturn().response.status)
        assertEquals(200, mvc.perform(post("/api/orders/$orderId/payment").with(customer)).andReturn().response.status)
        assertEquals(200, mvc.perform(post("/api/orders/$orderId/payment").with(customer)).andReturn().response.status)
        assertEquals(1, gateway.calls.size)
        assertEquals(order.total, gateway.calls.single().amount)
        mvc.perform(put("/api/customers/me/addresses/$addressId").with(customer).contentType(MediaType.APPLICATION_JSON)
            .content("""{"zipCode":"01001000","street":"Rua B","number":"99","city":"São Paulo","state":"SP"}"""))
        assertTrue(requireNotNull(orders.findById(order.id).orElseThrow().deliveryAddress).contains("Rua A, 10"))
    }

    @Test
    fun `only a confirmed provider payment changes order and duplicate notifications do not consume stock twice`() {
        assertEquals(409, mvc.perform(patch("/api/stores/$storeId/orders/$orderId/status").with(seller)
            .contentType(MediaType.APPLICATION_JSON).content("""{"status":"PAID"}""")).andReturn().response.status)
        assertEquals(403, notification("101", token = "forged"))
        assertEquals(204, notification("101"))
        assertEquals(204, notification("101"))
        val order = orders.findById(UUID.fromString(orderId)).orElseThrow()
        assertEquals("PAID", order.status.name)
        val stock = inventory.findById(UUID.fromString(productId)).orElseThrow()
        assertEquals(1, stock.quantity)
        assertEquals(0, stock.reserved)
        assertEquals(409, mvc.perform(patch("/api/stores/$storeId/orders/$orderId/status").with(seller)
            .contentType(MediaType.APPLICATION_JSON).content("""{"status":"CANCELED"}""")).andReturn().response.status)
    }

    @Test
    fun `late approval is flagged for reconciliation and never revives an expired reservation`() {
        val order = orders.findById(UUID.fromString(orderId)).orElseThrow()
        order.expiresAt = Instant.now().minusSeconds(1)
        orders.saveAndFlush(order)
        assertTrue(orderService.expireOne())
        assertEquals(204, notification("102"))
        val updated = orders.findById(order.id).orElseThrow()
        assertEquals("CANCELED", updated.status.name)
        assertTrue(updated.paymentReviewRequired)
        assertEquals(0, inventory.findById(UUID.fromString(productId)).orElseThrow().reserved)
    }

    @Test
    fun `wrong total currency or live environment never confirms a payment`() {
        assertEquals(204, notification("103", amount = "0.01"))
        assertEquals(204, notification("104", currency = "USD"))
        assertEquals(204, notification("105", liveMode = true))
        val order = orders.findById(UUID.fromString(orderId)).orElseThrow()
        assertEquals("PENDING", order.status.name)
        assertTrue(order.paymentReviewRequired)
    }

    @Test
    fun `synchronization checks ownership and ignores client return parameters`() {
        assertEquals(404, mvc.perform(post("/api/orders/$orderId/payment/sync").with(identity("CUSTOMER"))).andReturn().response.status)
        gateway.payments = listOf(PaymentNotification("106", UUID.fromString(orderId), "approved", java.math.BigDecimal("37.40"), "BRL", false))
        assertEquals(204, mvc.perform(post("/api/orders/$orderId/payment/sync").with(customer)).andReturn().response.status)
        assertEquals("PAID", orders.findById(UUID.fromString(orderId)).orElseThrow().status.name)
    }

    private fun createOrder(): String = created("/api/orders", customer,
        """{"storeId":"$storeId","addressId":"$addressId","shipping":0,"items":[{"productId":"$productId","quantity":1,"price":0.01}]}""", UUID.randomUUID().toString())

    private fun created(path: String, user: RequestPostProcessor, body: String, key: String = "unused-key"): String {
        val response = mvc.perform(post(path).with(user).header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON).content(body)).andReturn().response
        assertEquals(201, response.status, response.contentAsString)
        return mapper.readTree(response.contentAsString).path("id").asText()
    }

    private fun notification(paymentId: String, amount: String = "37.40", currency: String = "BRL",
        liveMode: Boolean = false, token: String = INTERNAL_TOKEN): Int =
        mvc.perform(post("/internal/payments/notifications").header("X-Internal-Token", token)
            .contentType(MediaType.APPLICATION_JSON).content("""{"paymentId":"$paymentId","orderId":"$orderId","status":"approved","amount":$amount,"currency":"$currency","liveMode":$liveMode}"""))
            .andReturn().response.status

    private fun identity(role: String) = jwt().jwt { it.subject(UUID.randomUUID().toString()).claim("role", role).claim("email", "${UUID.randomUUID()}@example.test") }
        .authorities(SimpleGrantedAuthority("ROLE_$role"))
}

@TestConfiguration
class PaymentTestConfig {
    @Bean @Primary fun recordingPaymentGateway() = RecordingPaymentGateway()
}

class RecordingPaymentGateway : PaymentGateway {
    val calls = mutableListOf<PaymentCheckoutRequest>()
    var payments = emptyList<PaymentNotification>()
    override fun createCheckout(request: PaymentCheckoutRequest): PaymentCheckoutResponse {
        calls.add(request)
        return PaymentCheckoutResponse("test-${request.orderId}", "https://www.mercadopago.com.br/checkout/test")
    }
    override fun findPayments(orderId: UUID) = payments
}
