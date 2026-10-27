package com.syndetis.core

import com.syndetis.core.model.dto.billing.*
import com.syndetis.core.service.SubscriptionGateway
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
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer
import tools.jackson.databind.ObjectMapper
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@SpringBootTest(properties = ["core.billing.enabled=true", "core.events.enabled=false",
    "core.billing.reconcile-delay-ms=3600000", "core.billing.internal-token=billing-internal-test-secret-at-least-32-chars"])
@AutoConfigureMockMvc
@Testcontainers
@Import(SubscriptionTestConfig::class)
class SubscriptionIntegrationTest(@Autowired private val mvc: MockMvc, @Autowired private val mapper: ObjectMapper,
    @Autowired private val provider: RecordingSubscriptionGateway, @Autowired private val jdbc: JdbcTemplate) {
    companion object {
        @Container @ServiceConnection val postgres = PostgreSQLContainer("postgres:16-alpine")
        const val TOKEN = "billing-internal-test-secret-at-least-32-chars"
    }
    private val seller = identity()
    private lateinit var storeId: String
    private lateinit var slug: String
    private val body = """{"planId":"STANDARD","name":"Lojista Teste","cpfCnpj":"12345678909","amount":0.01}"""

    @BeforeEach fun setup() {
        slug = "billing-${UUID.randomUUID()}"
        val response = mvc.perform(post("/api/stores").with(seller).contentType(MediaType.APPLICATION_JSON)
            .content("""{"name":"Loja","slug":"$slug"}""")).andReturn().response
        assertEquals(201, response.status)
        storeId = mapper.readTree(response.contentAsString).path("id").asText()
    }
    @Test fun `server prices and pending payment cannot publish while seller retains catalog access`() {
        val response = subscribe()
        assertEquals(200, response.status)
        assertTrue(response.contentAsString.contains("PENDING"))
        assertEquals(BigDecimal("29.90"), provider.requests.last().amount)
        assertEquals(404, mvc.perform(get("/api/public/stores/$slug")).andReturn().response.status)
        assertEquals(200, mvc.perform(get("/api/stores/$storeId/products").with(seller)).andReturn().response.status)
        assertEquals(409, mvc.perform(post("/api/stores/$storeId/layout/publish").with(seller).header("If-Match", "\"0\"")).andReturn().response.status)
        val calls = provider.requests.size
        assertEquals(200, subscribe().status)
        assertEquals(calls, provider.requests.size)
    }
    @Test fun `confirmed payment publishes and duplicate notifications never extend the paid period`() {
        subscribe()
        val snapshot = paid()
        assertEquals(403, notify(snapshot, "forged"))
        assertEquals(204, notify(snapshot)); assertEquals(204, notify(snapshot))
        assertEquals(200, mvc.perform(get("/api/public/stores/$slug/products")).andReturn().response.status)
        assertEquals(200, mvc.perform(get("/api/public/stores/$slug")).andReturn().response.status)
        val paidUntil = jdbc.queryForObject("SELECT paid_until FROM store_subscriptions WHERE id=?", java.sql.Timestamp::class.java, snapshot.reference)!!.toInstant()
        assertEquals(snapshot.payments.single().dueDate.plusMonths(1).atStartOfDay(ZoneId.of("America/Sao_Paulo")).toInstant(), paidUntil)
    }
    @Test fun `refund removes access and stale confirmation cannot restore it`() {
        subscribe(); val paid = paid(); notify(paid)
        val refunded = paid.copy(observedAt = paid.observedAt.plusMillis(1), payments = paid.payments.map { it.copy(status = "REFUNDED") })
        assertEquals(204, notify(refunded)); assertEquals(204, notify(paid))
        assertEquals(404, mvc.perform(get("/api/public/stores/$slug")).andReturn().response.status)
        assertEquals(404, mvc.perform(get("/api/public/stores/$slug/products")).andReturn().response.status)
    }
    @Test fun `cancel preserves paid period and expiry blocks new purchases without deleting store`() {
        subscribe(); notify(paid())
        assertEquals(200, mvc.perform(post("/api/stores/$storeId/subscription/cancel").with(seller)).andReturn().response.status)
        assertEquals(200, mvc.perform(get("/api/public/stores/$slug")).andReturn().response.status)
        jdbc.update("UPDATE store_subscriptions SET paid_until=now()-interval '1 second' WHERE store_id=?", UUID.fromString(storeId))
        assertEquals(404, mvc.perform(get("/api/public/stores/$slug")).andReturn().response.status)
        assertEquals(200, mvc.perform(get("/api/stores/$storeId").with(seller)).andReturn().response.status)
    }
    @Test fun `ownership and monthly price are checked for all subscription operations`() {
        subscribe()
        for (operation in listOf("", "/sync", "/cancel")) {
            val request = if (operation.isEmpty()) get("/api/stores/$storeId/subscription") else post("/api/stores/$storeId/subscription$operation")
            assertTrue(mvc.perform(request.with(identity())).andReturn().response.status in setOf(403, 404))
        }
        val wrong = paid().copy(amount = BigDecimal("0.01"))
        assertEquals(409, notify(wrong))
        assertEquals(404, mvc.perform(get("/api/public/stores/$slug")).andReturn().response.status)
    }
    private fun subscribe() = mvc.perform(post("/api/stores/$storeId/subscription").with(seller)
        .contentType(MediaType.APPLICATION_JSON).content(body)).andReturn().response
    private fun paid(): BillingSnapshot = provider.snapshots.values.last().copy(observedAt = Instant.now(),
        payments = listOf(BillingPayment("pay_test", "RECEIVED", BigDecimal("29.90"), LocalDate.now(ZoneId.of("America/Sao_Paulo")))))
    private fun notify(snapshot: BillingSnapshot, token: String = TOKEN) = mvc.perform(post("/internal/billing/notifications")
        .header("X-Internal-Token", token).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(snapshot))).andReturn().response.status
    private fun identity() = jwt().jwt { it.subject(UUID.randomUUID().toString()).claim("email", "seller@example.test").claim("role", "SELLER") }
        .authorities(SimpleGrantedAuthority("ROLE_SELLER"))
}

@TestConfiguration
class SubscriptionTestConfig { @Bean @Primary fun subscriptionGateway() = RecordingSubscriptionGateway() }
class RecordingSubscriptionGateway : SubscriptionGateway {
    val requests = mutableListOf<BillingCreateRequest>()
    val snapshots = linkedMapOf<String, BillingSnapshot>()
    override fun create(request: BillingCreateRequest): BillingSnapshot {
        requests.add(request)
        val id = "sub_${request.reference}"
        val snapshot = BillingSnapshot(request.reference, id, "cus_test", "ACTIVE", request.amount, "MONTHLY", Instant.now(), emptyList())
        snapshots[id] = snapshot
        return snapshot
    }
    override fun synchronize(providerId: String) = requireNotNull(snapshots[providerId]).copy(observedAt = Instant.now())
    override fun cancel(providerId: String) { snapshots[providerId] = requireNotNull(snapshots[providerId]).copy(providerStatus = "DELETED") }
}
