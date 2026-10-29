package com.syndetis.core

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.testcontainers.service.connection.ServiceConnection
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@SpringBootTest(properties = ["core.events.enabled=false"])
@ActiveProfiles("kubernetes")
@AutoConfigureMockMvc
@Testcontainers
class KubernetesProbeIntegrationTest(@Autowired private val mvc: MockMvc) {
    companion object {
        @Container @ServiceConnection val postgres = PostgreSQLContainer("postgres:16-alpine")
    }

    @Test fun `public probes work without bypassing protection of the store APIs`() {
        for (path in listOf("/livez", "/readyz")) {
            val response = mvc.perform(get(path)).andReturn().response
            assertEquals(200, response.status, path)
            assertTrue(response.contentAsString.contains("UP"))
        }
        assertEquals(401, mvc.perform(get("/api/stores/me")).andReturn().response.status)
        assertTrue(mvc.perform(get("/actuator/env")).andReturn().response.status in setOf(401, 403, 404))
    }
}
