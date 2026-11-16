package com.syndetis.auth

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

@SpringBootTest
@ActiveProfiles("kubernetes")
@AutoConfigureMockMvc
@Testcontainers
class KubernetesProbeIntegrationTest(@Autowired private val mvc: MockMvc) {
    companion object {
        @Container @ServiceConnection val postgres = PostgreSQLContainer("postgres:16-alpine")
    }

    @Test fun `public probes work with the Kubernetes profile without exposing administrative endpoints`() {
        for (path in listOf("/livez", "/readyz")) {
            val response = mvc.perform(get(path)).andReturn().response
            assertEquals(200, response.status, path)
            assertTrue(response.contentAsString.contains("UP"))
        }
        assertTrue(mvc.perform(get("/actuator/env")).andReturn().response.status in setOf(401, 403, 404))
    }
}
