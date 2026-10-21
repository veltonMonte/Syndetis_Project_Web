package com.syndetis.core

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
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class StoreIntegrationTest(
    @Autowired private val mvc: MockMvc,
    @Autowired private val mapper: ObjectMapper,
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

    private fun createStore(): UUID {
        val slug = "store-${UUID.randomUUID()}"
        val response = mvc.perform(post("/api/stores").with(user("SELLER"))
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"name":"Minha Loja","slug":"$slug"}""")).andReturn().response
        assertEquals(201, response.status)
        return UUID.fromString(mapper.readTree(response.contentAsString).path("id").asText())
    }

    private fun user(role: String, id: UUID = sellerId) = jwt()
        .jwt { it.subject(id.toString()).claim("role", role).claim("email", "seller@example.test") }
        .authorities(SimpleGrantedAuthority("ROLE_$role"))
}
