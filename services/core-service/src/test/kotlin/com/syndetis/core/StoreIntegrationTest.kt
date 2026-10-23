package com.syndetis.core

import com.syndetis.core.repository.InventoryRepository
import com.syndetis.core.repository.OrderRepository
import com.syndetis.core.service.InventoryService
import com.syndetis.core.service.OrderService
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.testcontainers.service.connection.ServiceConnection
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer
import tools.jackson.databind.ObjectMapper
import java.util.UUID
import java.time.Instant
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class StoreIntegrationTest(
    @Autowired private val mvc: MockMvc,
    @Autowired private val mapper: ObjectMapper,
    @Autowired private val inventoryService: InventoryService,
    @Autowired private val inventoryRepository: InventoryRepository,
    @Autowired private val orderRepository: OrderRepository,
    @Autowired private val orderService: OrderService,
) {
    companion object {
        @Container
        @ServiceConnection
        val postgres = PostgreSQLContainer("postgres:16-alpine")
    }

    private val sellerId = UUID.randomUUID()

    @Test
    fun `only a seller can create a store and the slug is unique`() {
        val slug = "store-${UUID.randomUUID()}"
        val body = """{"name":"Minha Loja","slug":"$slug"}"""
        assertEquals(401, mvc.perform(post("/api/stores").contentType(MediaType.APPLICATION_JSON).content(body)).andReturn().response.status)
        assertEquals(403, mvc.perform(post("/api/stores").with(user("CUSTOMER")).contentType(MediaType.APPLICATION_JSON).content(body)).andReturn().response.status)
        assertEquals(201, mvc.perform(post("/api/stores").with(user("SELLER")).contentType(MediaType.APPLICATION_JSON).content(body)).andReturn().response.status)
        assertEquals(409, mvc.perform(post("/api/stores").with(user("SELLER")).contentType(MediaType.APPLICATION_JSON).content(body)).andReturn().response.status)
    }

    @Test
    fun `another seller cannot read or edit a store`() {
        val storeId = createStore()
        val outsider = user("SELLER", UUID.randomUUID())
        assertEquals(404, mvc.perform(get("/api/stores/$storeId").with(outsider)).andReturn().response.status)
        assertEquals(403, mvc.perform(put("/api/stores/$storeId").with(user("SELLER", UUID.randomUUID()))
            .contentType(MediaType.APPLICATION_JSON).content("""{"name":"Outra","status":"ACTIVE"}""")).andReturn().response.status)
    }

    @Test
    fun `draft changes stay private until publish and stale versions conflict`() {
        val storeId = createStore()
        val initial = mvc.perform(get("/api/stores/$storeId/layout").with(user("SELLER"))).andReturn().response
        assertEquals("\"0\"", initial.getHeader("ETag"))

        val slug = mapper.readTree(mvc.perform(get("/api/stores/$storeId").with(user("SELLER")))
            .andReturn().response.contentAsString).path("slug").asText()
        val before = mvc.perform(get("/api/public/stores/$slug")).andReturn().response.contentAsString
        val draft = """{"schemaVersion":1,"theme":{"primaryColor":"#123456"},"sections":[{"type":"hero","title":"Novo"}]}"""
        val updated = mvc.perform(put("/api/stores/$storeId/layout").with(user("SELLER"))
            .header("If-Match", "\"0\"").contentType(MediaType.APPLICATION_JSON).content(draft)).andReturn().response
        assertEquals(200, updated.status)
        assertEquals(409, mvc.perform(put("/api/stores/$storeId/layout").with(user("SELLER"))
            .header("If-Match", "\"0\"").contentType(MediaType.APPLICATION_JSON).content(draft)).andReturn().response.status)
        assertEquals(before, mvc.perform(get("/api/public/stores/$slug")).andReturn().response.contentAsString)

        val published = mvc.perform(post("/api/stores/$storeId/layout/publish").with(user("SELLER"))
            .header("If-Match", requireNotNull(updated.getHeader("ETag")))).andReturn().response
        assertEquals(200, published.status)
        assertNotEquals(before, mvc.perform(get("/api/public/stores/$slug")).andReturn().response.contentAsString)
    }

    @Test
    fun `catalog keeps products inside their store and hides inactive products`() {
        val storeId = createStore()
        val otherStoreId = createStore()
        val category = mvc.perform(post("/api/stores/$storeId/categories").with(user("SELLER"))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"name":"Roupas","slug":"roupas","position":0}""")).andReturn().response
        assertEquals(201, category.status)
        val categoryId = mapper.readTree(category.contentAsString).path("id").asText()
        val productBody = """{"name":"Camiseta","price":39.90,"sku":"CAM-${UUID.randomUUID()}","categoryId":"$categoryId"}"""
        assertEquals(404, mvc.perform(post("/api/stores/$otherStoreId/products").with(user("SELLER"))
            .contentType(MediaType.APPLICATION_JSON).content(productBody)).andReturn().response.status)
        val product = mvc.perform(post("/api/stores/$storeId/products").with(user("SELLER"))
            .contentType(MediaType.APPLICATION_JSON).content(productBody)).andReturn().response
        assertEquals(201, product.status)
        assertEquals(409, mvc.perform(post("/api/stores/$storeId/products").with(user("SELLER"))
            .contentType(MediaType.APPLICATION_JSON).content(productBody)).andReturn().response.status)

        val productId = mapper.readTree(product.contentAsString).path("id").asText()
        val slug = mapper.readTree(mvc.perform(get("/api/stores/$storeId").with(user("SELLER")))
            .andReturn().response.contentAsString).path("slug").asText()
        val publicBefore = mvc.perform(get("/api/public/stores/$slug/products")).andReturn().response
        assertEquals(1, mapper.readTree(publicBefore.contentAsString).path("totalElements").asInt())
        assertEquals(204, mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
            .delete("/api/stores/$storeId/products/$productId").with(user("SELLER"))).andReturn().response.status)
        assertEquals(404, mvc.perform(get("/api/public/stores/$slug/products/$productId")).andReturn().response.status)
    }

    @Test
    fun `concurrent reservations cannot sell the same last item twice`() {
        val storeId = createStore()
        val productBody = """{"name":"Última unidade","price":10.00,"sku":"LAST-${UUID.randomUUID()}"}"""
        val product = mvc.perform(post("/api/stores/$storeId/products").with(user("SELLER"))
            .contentType(MediaType.APPLICATION_JSON).content(productBody)).andReturn().response
        val productId = UUID.fromString(mapper.readTree(product.contentAsString).path("id").asText())
        assertEquals(200, mvc.perform(post("/api/stores/$storeId/inventory/$productId/movements").with(user("SELLER"))
            .contentType(MediaType.APPLICATION_JSON).content("""{"delta":1,"reason":"Carga inicial"}"""))
            .andReturn().response.status)

        val start = CountDownLatch(1)
        val pool = Executors.newFixedThreadPool(8)
        try {
            val attempts = (1..8).map {
                pool.submit<Boolean> {
                    start.await()
                    runCatching { inventoryService.reserve(mapOf(productId to 1), UUID.randomUUID()) }.isSuccess
                }
            }
            start.countDown()
            assertEquals(1, attempts.count { it.get(20, TimeUnit.SECONDS) })
            val stock = inventoryRepository.findById(productId).orElseThrow { AssertionError() }
            assertEquals(1, stock.quantity)
            assertEquals(1, stock.reserved)
        } finally {
            pool.shutdownNow()
        }
    }

    @Test
    fun `customer addresses are private to their owner`() {
        val owner = user("CUSTOMER", UUID.randomUUID())
        val other = user("CUSTOMER", UUID.randomUUID())
        assertEquals(200, mvc.perform(get("/api/customers/me").with(owner)).andReturn().response.status)
        val created = mvc.perform(post("/api/customers/me/addresses").with(owner)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"zipCode":"01001000","street":"Rua Exemplo","number":"10","city":"São Paulo","state":"SP"}"""))
            .andReturn().response
        assertEquals(201, created.status)
        val addressId = mapper.readTree(created.contentAsString).path("id").asText()
        assertEquals(404, mvc.perform(get("/api/customers/me/addresses/$addressId").with(other)).andReturn().response.status)
    }

    @Test
    fun `order key is idempotent and the server calculates totals and reserves stock`() {
        val storeId = createStore()
        val productId = createProductWithStock(storeId, 2)
        val customer = user("CUSTOMER", UUID.randomUUID())
        val key = UUID.randomUUID().toString()
        val body = """{"storeId":"$storeId","items":[{"productId":"$productId","quantity":1,"price":0.01}]}"""
        val first = mvc.perform(post("/api/orders").with(customer).header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON).content(body)).andReturn().response
        assertEquals(201, first.status)
        val firstJson = mapper.readTree(first.contentAsString)
        assertEquals("39.9", firstJson.path("total").asText().trimEnd('0').trimEnd('.'))
        val second = mvc.perform(post("/api/orders").with(customer).header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON).content(body)).andReturn().response
        assertEquals(201, second.status)
        assertEquals(firstJson.path("id").asText(), mapper.readTree(second.contentAsString).path("id").asText())
        assertEquals(409, mvc.perform(post("/api/orders").with(customer).header("Idempotency-Key", key)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"storeId":"$storeId","items":[{"productId":"$productId","quantity":2}]}"""))
            .andReturn().response.status)
        assertEquals(1, inventoryRepository.findById(productId).orElseThrow { AssertionError() }.reserved)
    }

    @Test
    fun `expired order releases stock exactly once`() {
        val storeId = createStore()
        val productId = createProductWithStock(storeId, 1)
        val customer = user("CUSTOMER", UUID.randomUUID())
        val created = mvc.perform(post("/api/orders").with(customer)
            .header("Idempotency-Key", UUID.randomUUID().toString())
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"storeId":"$storeId","items":[{"productId":"$productId","quantity":1}]}"""))
            .andReturn().response
        assertEquals(201, created.status)
        val orderId = UUID.fromString(mapper.readTree(created.contentAsString).path("id").asText())
        val order = orderRepository.findById(orderId).orElseThrow { AssertionError() }
        order.expiresAt = Instant.now().minusSeconds(1)
        orderRepository.saveAndFlush(order)
        kotlin.test.assertTrue(orderService.expireOne())
        kotlin.test.assertFalse(orderService.expireOne())
        assertEquals(0, inventoryRepository.findById(productId).orElseThrow { AssertionError() }.reserved)
        assertEquals("CANCELED", orderRepository.findById(orderId).orElseThrow { AssertionError() }.status.name)
    }

    @Test
    fun `concurrent retries with one idempotency key create one reservation`() {
        val storeId = createStore()
        val productId = createProductWithStock(storeId, 2)
        val customerId = UUID.randomUUID()
        val key = UUID.randomUUID().toString()
        val body = """{"storeId":"$storeId","items":[{"productId":"$productId","quantity":1}]}"""
        val start = CountDownLatch(1)
        val pool = Executors.newFixedThreadPool(4)
        try {
            val attempts = (1..4).map {
                pool.submit<Pair<Int, String>> {
                    start.await()
                    val response = mvc.perform(post("/api/orders").with(user("CUSTOMER", customerId))
                        .header("Idempotency-Key", key).contentType(MediaType.APPLICATION_JSON).content(body))
                        .andReturn().response
                    response.status to response.contentAsString
                }
            }
            start.countDown()
            val responses = attempts.map { it.get(30, TimeUnit.SECONDS) }
            assertEquals(setOf(201), responses.map { it.first }.toSet())
            assertEquals(1, responses.map { mapper.readTree(it.second).path("id").asText() }.toSet().size)
            assertEquals(1, inventoryRepository.findById(productId).orElseThrow { AssertionError() }.reserved)
        } finally {
            pool.shutdownNow()
        }
    }

    private fun createStore(): UUID {
        val slug = "store-${UUID.randomUUID()}"
        val response = mvc.perform(post("/api/stores").with(user("SELLER"))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"name":"Minha Loja","slug":"$slug"}""")).andReturn().response
        assertEquals(201, response.status)
        return UUID.fromString(mapper.readTree(response.contentAsString).path("id").asText())
    }

    private fun createProductWithStock(storeId: UUID, quantity: Int): UUID {
        val created = mvc.perform(post("/api/stores/$storeId/products").with(user("SELLER"))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"name":"Camiseta","price":39.90,"sku":"SKU-${UUID.randomUUID()}"}"""))
            .andReturn().response
        assertEquals(201, created.status)
        val productId = UUID.fromString(mapper.readTree(created.contentAsString).path("id").asText())
        assertEquals(200, mvc.perform(post("/api/stores/$storeId/inventory/$productId/movements").with(user("SELLER"))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"delta":$quantity,"reason":"Carga inicial"}""")).andReturn().response.status)
        return productId
    }

    private fun user(role: String, id: UUID = sellerId) = jwt()
        .jwt { it.subject(id.toString()).claim("role", role).claim("email", "seller@example.test") }
        .authorities(SimpleGrantedAuthority("ROLE_$role"))
}
