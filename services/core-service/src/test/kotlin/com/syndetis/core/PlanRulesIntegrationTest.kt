package com.syndetis.core

import com.syndetis.core.exception.ConflictException
import com.syndetis.core.exception.ForbiddenException
import com.syndetis.core.model.dto.billing.*
import com.syndetis.core.service.AiQuotaService
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
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.sql.Timestamp
import java.time.Clock
import java.time.Instant
import java.time.ZoneId
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.test.*

@SpringBootTest(properties = ["core.billing.enabled=true", "core.events.enabled=false", "core.billing.reconcile-delay-ms=3600000"])
@AutoConfigureMockMvc
@Testcontainers
@Import(PlanRulesClockConfig::class)
class PlanRulesIntegrationTest(
    @Autowired private val mvc: MockMvc, @Autowired private val mapper: ObjectMapper,
    @Autowired private val jdbc: JdbcTemplate, @Autowired private val ai: AiQuotaService,
    @Autowired private val clock: MutableQuotaClock,
) {
    companion object {
        @Container @ServiceConnection val postgres = PostgreSQLContainer("postgres:16-alpine")
    }
    private val sellerId = UUID.randomUUID()
    private lateinit var storeId: UUID
    private lateinit var slug: String
    private val standardLayout = """{"schemaVersion":1,"templateId":"ecommerce","theme":{"primaryColor":"#123456","backgroundColor":"#ffffff","fontFamily":"Inter, sans-serif","logoUrl":"https://example.test/logo.png"},"sections":[{"type":"hero","title":"Minha marca","imageUrl":"https://example.test/foto.jpg","theme":{"headingFontFamily":"Georgia","textColor":"#123456"}},{"type":"product-grid","title":"Coleção"},{"type":"footer","text":"Minha marca"}]}"""
    private val customLayout = """{"schemaVersion":1,"theme":{"primaryColor":"#123456"},"sections":[{"type":"footer"},{"type":"hero","title":"Meu layout","settings":{"align":"right"}}]}"""

    @BeforeEach fun setup() {
        clock.current = Instant.parse("2026-10-29T12:00:00Z")
        slug = "plans-${UUID.randomUUID()}"
        val response = mvc.perform(post("/api/stores").with(seller()).contentType(MediaType.APPLICATION_JSON)
            .content("""{"name":"Marca","slug":"$slug"}""")).andReturn().response
        assertEquals(201, response.status)
        storeId = UUID.fromString(mapper.readTree(response.contentAsString).path("id").asText())
    }

    @Test fun `catalog publishes exact approved prices capabilities and limits`() {
        val response = mvc.perform(get("/api/public/plans")).andReturn().response
        assertEquals(200, response.status)
        val plans = mapper.readTree(response.contentAsString).path("plans").associateBy { it.path("id").asText() }
        assertEquals(2900, plans.getValue("STANDARD").path("priceInCents").asInt())
        assertEquals(100, plans.getValue("STANDARD").path("activeProductLimit").asInt())
        assertEquals(0, plans.getValue("STANDARD").path("aiDailyRequestLimit").asInt())
        assertFalse(plans.getValue("STANDARD").path("structuralEditing").asBoolean())
        assertEquals(4900, plans.getValue("MAKER").path("priceInCents").asInt())
        assertEquals(500, plans.getValue("MAKER").path("activeProductLimit").asInt())
        assertEquals(30, plans.getValue("MAKER").path("aiDailyRequestLimit").asInt())
        assertTrue(plans.getValue("MAKER").path("structuralEditing").asBoolean())
    }

    @Test fun `pending expired or client selected Maker never grants premium rights`() {
        val subscription = paidPlan("MAKER")
        jdbc.update("UPDATE store_subscriptions SET paid_until=NULL WHERE id=?", subscription)
        assertEquals("STANDARD", entitlements().path("planId").asText())
        assertEquals(409, save(customLayout).status)
        authenticated { assertFailsWith<ForbiddenException> { ai.reserve(storeId, UUID.randomUUID(), AiOperation.LAYOUT_EDIT) } }
        jdbc.update("UPDATE store_subscriptions SET paid_until=now()-interval '1 second' WHERE id=?", subscription)
        assertFalse(entitlements().path("capabilities").path("ai").asBoolean())
        assertEquals(409, publish().status)
    }

    @Test fun `Standard edits branding content fonts colors and images but cannot forge template structure`() {
        paidPlan("STANDARD")
        assertEquals(200, save(standardLayout).status)
        assertEquals(200, publish().status)
        val invalid = listOf(customLayout,
            standardLayout.replace("\"ecommerce\"", "\"inventado\""),
            standardLayout.replace("\"title\":\"Coleção\"", "\"title\":\"Coleção\",\"columns\":4"),
            standardLayout.replace("\"title\":\"Coleção\"", "\"title\":\"Coleção\",\"style\":{\"display\":\"none\"}"),
            standardLayout.replace("\"fontFamily\":\"Inter, sans-serif\"", "\"fontFamily\":\"Inter, sans-serif\",\"customCss\":\"display:none\""),
            standardLayout.replace("\"title\":\"Minha marca\"", "\"title\":{\"html\":\"custom\"}"))
        invalid.forEach { assertEquals(409, save(it).status, it) }
        assertEquals(mapper.readTree(standardLayout), draft())
    }

    @Test fun `Maker may rearrange remove and configure components until its paid period expires`() {
        val subscription = paidPlan("MAKER")
        assertEquals(200, save(customLayout).status)
        assertEquals(200, publish().status)
        jdbc.update("UPDATE store_subscriptions SET cancelled_at=now(),provider_status='DELETED' WHERE id=?", subscription)
        assertTrue(entitlements().path("capabilities").path("structuralEditing").asBoolean())
        assertEquals(200, save(customLayout).status)
        jdbc.update("UPDATE store_subscriptions SET paid_until=now()-interval '1 second' WHERE id=?", subscription)
        assertEquals(409, save(customLayout).status)
    }

    @Test fun `product limit also applies to concurrent creation and reactivation while edits and deactivation remain possible`() {
        paidPlan("STANDARD")
        seedProducts(99)
        val statuses = parallel(4) { createProduct("parallel-$it").status }
        assertEquals(1, statuses.count { it == 201 })
        assertEquals(3, statuses.count { it == 409 })
        val inactive = createProduct("inactive", active = false)
        assertEquals(201, inactive.status)
        val id = mapper.readTree(inactive.contentAsString).path("id").asText()
        assertEquals(409, editProduct(id, "inactive", true).status)
        val activeId = jdbc.queryForObject("SELECT id FROM products WHERE store_id=? AND sku='seed-1'", UUID::class.java, storeId)!!
        assertEquals(200, editProduct(activeId.toString(), "seed-1", true).status)
        assertEquals(204, mvc.perform(delete("/api/stores/$storeId/products/$activeId").with(seller())).andReturn().response.status)
        assertEquals(200, editProduct(id, "inactive", true).status)
        assertEquals(100, entitlements().path("products").path("used").asInt())
    }

    @Test fun `Maker permits 500 active products but never 501`() {
        paidPlan("MAKER")
        seedProducts(499)
        assertEquals(201, createProduct("last").status)
        assertEquals(409, createProduct("overflow").status)
        assertEquals(0, entitlements().path("products").path("remaining").asInt())
    }

    @Test fun `downgrade preserves products drafts and public snapshot and requires adaptation before republishing`() {
        val subscription = paidPlan("MAKER")
        seedProducts(101)
        assertEquals(200, save(customLayout).status)
        assertEquals(200, publish().status)
        jdbc.update("UPDATE store_subscriptions SET plan_id='STANDARD',price=29 WHERE id=?", subscription)
        val rights = entitlements()
        assertTrue(rights.path("products").path("overLimit").asBoolean())
        assertTrue(rights.path("layoutAdaptationRequired").asBoolean())
        assertFalse(rights.path("canRepublish").asBoolean())
        assertEquals(mapper.readTree(customLayout), draft())
        val public = mvc.perform(get("/api/public/stores/$slug")).andReturn().response
        assertEquals(200, public.status)
        assertTrue(public.contentAsString.contains("Meu layout"))
        assertEquals(409, createProduct("blocked").status)
        assertEquals(409, publish().status)
        assertEquals(200, save(standardLayout).status)
        assertEquals(409, publish().status)
        val id = jdbc.queryForObject("SELECT id FROM products WHERE store_id=? AND sku='seed-1'", UUID::class.java, storeId)!!
        assertEquals(200, editProduct(id.toString(), "seed-1", false).status)
        assertEquals(200, publish().status)
        assertEquals(101, jdbc.queryForObject("SELECT count(*) FROM products WHERE store_id=?", Int::class.java, storeId))
    }

    @Test fun `entitlements are isolated by store owner and require authentication`() {
        assertEquals(401, mvc.perform(get("/api/stores/$storeId/entitlements")).andReturn().response.status)
        assertEquals(404, mvc.perform(get("/api/stores/$storeId/entitlements").with(seller(UUID.randomUUID()))).andReturn().response.status)
        paidPlan("MAKER")
        authenticated(UUID.randomUUID()) {
            assertFailsWith<ForbiddenException> { ai.reserve(storeId, UUID.randomUUID(), AiOperation.IMAGE_GENERATION) }
        }
        assertEquals(0, ai.usage(storeId, 30).used)
    }

    @Test fun `AI shares 30 daily requests across image and layout operations including concurrent reservations`() {
        paidPlan("MAKER")
        seedAiUsage(29)
        val results = parallel(6) { index -> authenticated {
            try { ai.reserve(storeId, UUID.randomUUID(), AiOperation.entries[index % 2]); true }
            catch (_: ConflictException) { false }
        } }
        assertEquals(1, results.count { it })
        assertEquals(30, ai.usage(storeId, 30).used)
        assertEquals(0, entitlements().path("ai").path("remaining").asInt())
    }

    @Test fun `AI idempotency completion and failure cannot double charge or refund completed work`() {
        paidPlan("MAKER")
        val id = UUID.randomUUID()
        val retries = parallel(4) { authenticated { ai.reserve(storeId, id, AiOperation.LAYOUT_EDIT) } }
        assertEquals(1, retries.count { it.acquired })
        assertEquals(1, ai.usage(storeId, 30).used)
        authenticated { assertFailsWith<ConflictException> { ai.reserve(storeId, id, AiOperation.IMAGE_GENERATION) } }
        ai.complete(storeId, id); ai.complete(storeId, id)
        assertFailsWith<ConflictException> { ai.fail(storeId, id) }
        assertFalse(authenticated { ai.reserve(storeId, id, AiOperation.LAYOUT_EDIT) }.acquired)
        val failed = UUID.randomUUID()
        authenticated { ai.reserve(storeId, failed, AiOperation.IMAGE_GENERATION) }
        ai.fail(storeId, failed); ai.fail(storeId, failed)
        assertEquals(1, ai.usage(storeId, 30).used)
        authenticated { assertFailsWith<ConflictException> { ai.reserve(storeId, failed, AiOperation.IMAGE_GENERATION) } }
    }

    @Test fun `daily quota resets at Sao Paulo midnight without refilling on plan changes or releasing unknown outcomes`() {
        val subscription = paidPlan("MAKER")
        clock.current = Instant.parse("2026-10-30T02:40:00Z")
        val id = UUID.randomUUID()
        authenticated { ai.reserve(storeId, id, AiOperation.IMAGE_GENERATION) }
        clock.current = Instant.parse("2026-10-30T02:59:59Z")
        assertEquals(1, ai.usage(storeId, 30).used)
        assertFailsWith<ConflictException> { ai.complete(storeId, id) }
        assertEquals(Instant.parse("2026-10-30T03:00:00Z"), ai.usage(storeId, 30).resetsAt)
        jdbc.update("UPDATE store_subscriptions SET plan_id='STANDARD' WHERE id=?", subscription)
        authenticated { assertFailsWith<ForbiddenException> { ai.reserve(storeId, UUID.randomUUID(), AiOperation.LAYOUT_EDIT) } }
        jdbc.update("UPDATE store_subscriptions SET plan_id='MAKER' WHERE id=?", subscription)
        assertEquals(1, ai.usage(storeId, 30).used)
        clock.current = Instant.parse("2026-10-30T03:00:00Z")
        assertEquals(0, ai.usage(storeId, 30).used)
        assertEquals(30, ai.usage(storeId, 30).remaining)
    }

    private fun paidPlan(plan: String): UUID {
        val id = UUID.randomUUID()
        jdbc.update("INSERT INTO store_subscriptions(id,store_id,plan_id,price,paid_until) VALUES (?,?,?,?,now()+interval '1 day')",
            id, storeId, plan, if (plan == "MAKER") 49 else 29)
        return id
    }
    private fun seedProducts(count: Int) {
        jdbc.update("""INSERT INTO products(store_id,name,price,sku) SELECT ?, 'Produto',10,'seed-' || n FROM generate_series(1,?) n""", storeId, count)
    }
    private fun seedAiUsage(count: Int) {
        jdbc.update("""INSERT INTO ai_request_usage(store_id,request_id,operation,quota_date,state,created_at,expires_at)
            SELECT ?,gen_random_uuid(),'LAYOUT_EDIT',?,'COMPLETED',?,? FROM generate_series(1,?)""", storeId,
            clock.instant().atZone(AiQuotaService.ZONE).toLocalDate(), Timestamp.from(clock.instant()), Timestamp.from(clock.instant()), count)
    }
    private fun entitlements(): JsonNode {
        val result = mvc.perform(get("/api/stores/$storeId/entitlements").with(seller())).andReturn().response
        assertEquals(200, result.status)
        return mapper.readTree(result.contentAsString)
    }
    private fun draft(): JsonNode = mapper.readTree(mvc.perform(get("/api/stores/$storeId/layout").with(seller()))
        .andReturn().response.contentAsString).path("config")
    private fun version(): String = mvc.perform(get("/api/stores/$storeId/layout").with(seller())).andReturn().response.getHeader("ETag")!!
    private fun save(layout: String) = mvc.perform(put("/api/stores/$storeId/layout").with(seller())
        .header("If-Match", version()).contentType(MediaType.APPLICATION_JSON).content(layout)).andReturn().response
    private fun publish() = mvc.perform(post("/api/stores/$storeId/layout/publish").with(seller()).header("If-Match", version())).andReturn().response
    private fun createProduct(sku: String, active: Boolean = true) = mvc.perform(post("/api/stores/$storeId/products").with(seller())
        .contentType(MediaType.APPLICATION_JSON).content(product(sku, active))).andReturn().response
    private fun editProduct(id: String, sku: String, active: Boolean) = mvc.perform(put("/api/stores/$storeId/products/$id").with(seller())
        .contentType(MediaType.APPLICATION_JSON).content(product(sku, active))).andReturn().response
    private fun product(sku: String, active: Boolean) = """{"name":"Produto atualizado","price":10,"sku":"$sku","active":$active}"""
    private fun seller(id: UUID = sellerId) = jwt().jwt { it.subject(id.toString()).claim("role", "SELLER") }
        .authorities(SimpleGrantedAuthority("ROLE_SELLER"))
    private fun <T> authenticated(id: UUID = sellerId, action: () -> T): T {
        val context = SecurityContextHolder.createEmptyContext()
        context.authentication = JwtAuthenticationToken(Jwt.withTokenValue("test").header("alg", "RS256")
            .subject(id.toString()).build(), listOf(SimpleGrantedAuthority("ROLE_SELLER")))
        SecurityContextHolder.setContext(context)
        try { return action() } finally { SecurityContextHolder.clearContext() }
    }
    private fun <T> parallel(count: Int, action: (Int) -> T): List<T> {
        val executor = Executors.newFixedThreadPool(count)
        val start = CountDownLatch(1)
        try {
            val futures = (0 until count).map { index -> executor.submit<T> { start.await(); action(index) } }
            start.countDown()
            return futures.map { it.get(30, TimeUnit.SECONDS) }
        } finally { executor.shutdownNow() }
    }
}

@TestConfiguration
class PlanRulesClockConfig { @Bean @Primary fun quotaClock() = MutableQuotaClock() }
class MutableQuotaClock : Clock() {
    @Volatile var current: Instant = Instant.parse("2026-10-29T12:00:00Z")
    override fun instant(): Instant = current
    override fun getZone(): ZoneId = ZoneId.of("UTC")
    override fun withZone(zone: ZoneId): Clock = Clock.fixed(current, zone)
}
