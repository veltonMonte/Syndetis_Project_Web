package com.syndetis.auth

import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.testcontainers.service.connection.ServiceConnection
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer

@SpringBootTest(properties = [
    "GOOGLE_CLIENT_ID=test-google-client",
    "GOOGLE_CLIENT_SECRET=test-google-secret",
    "GITHUB_CLIENT_ID=test-github-client",
    "GITHUB_CLIENT_SECRET=test-github-secret",
])
@ActiveProfiles("oauth-google", "oauth-github")
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class OAuthAuthorizationFlowTest {
    companion object {
        @Container @ServiceConnection val postgres = PostgreSQLContainer("postgres:16-alpine")
    }

    @Autowired private lateinit var mvc: MockMvc
    @Autowired private lateinit var jdbc: JdbcTemplate

    @Test
    fun `Google and GitHub redirects retain OAuth state in shared JDBC sessions`() {
        val google = mvc.perform(get("/oauth2/authorization/google"))
            .andExpect(status().is3xxRedirection).andReturn().response
        assertTrue(google.redirectedUrl!!.startsWith("https://accounts.google.com/"))

        val github = mvc.perform(get("/oauth2/authorization/github"))
            .andExpect(status().is3xxRedirection).andReturn().response
        assertTrue(github.redirectedUrl!!.startsWith("https://github.com/login/oauth/authorize"))

        val sessions = jdbc.queryForObject("SELECT COUNT(*) FROM SPRING_SESSION", Int::class.java)
        assertTrue((sessions ?: 0) >= 2)
    }
}
