package com.syndetis.auth

import com.syndetis.auth.model.entity.User
import com.syndetis.auth.repository.RefreshTokenRepository
import com.syndetis.auth.repository.UserRepository
import com.syndetis.auth.service.JwtService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.testcontainers.service.connection.ServiceConnection
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer
import tools.jackson.databind.ObjectMapper
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class RefreshTokenIntegrationTest {
    companion object {
        @Container
        @ServiceConnection
        val postgres = PostgreSQLContainer("postgres:16-alpine")
    }

    @Autowired private lateinit var mvc: MockMvc
    @Autowired private lateinit var mapper: ObjectMapper
    @Autowired private lateinit var users: UserRepository
    @Autowired private lateinit var refreshTokens: RefreshTokenRepository
    @Autowired private lateinit var passwordEncoder: PasswordEncoder
    @Autowired private lateinit var jwtService: JwtService

    @BeforeEach
    fun reset() {
        refreshTokens.deleteAll()
        users.deleteAll()
        users.saveAndFlush(
            User(firstName = "Ana", email = "ana@example.com", password = passwordEncoder.encode("Password123!"))
        )
    }

    @Test
    fun `login stores only the refresh hash and issues a ten minute access token`() {
        val response = login()
        val token = response.path("refreshToken").asText()
        val stored = refreshTokens.findAll().single()
        val claims = jwtService.validateToken(response.path("accessToken").asText())!!

        assertEquals(43, token.length)
        assertNotEquals(token, stored.tokenHash)
        assertEquals(64, stored.tokenHash.length)
        assertEquals(600L, response.path("expiresIn").asLong())
        assertEquals(600L, (claims.expiration.time - claims.issuedAt.time) / 1000)
    }

    @Test
    fun `refresh rotates token and reuse revokes the whole family`() {
        val first = login().path("refreshToken").asText()
        val second = refresh(first, 200).path("refreshToken").asText()
        assertNotEquals(first, second)

        refresh(first, 401)
        refresh(second, 401)
        assertTrue(refreshTokens.findAll().all { it.revokedAt != null })
    }

    @Test
    fun `logout revokes the current session and is idempotent`() {
        val token = login().path("refreshToken").asText()
        val request = """{"refreshToken":"$token"}"""
        mvc.perform(post("/api/auth/logout").contentType(MediaType.APPLICATION_JSON).content(request))
            .andExpect(status().isNoContent)
        mvc.perform(post("/api/auth/logout").contentType(MediaType.APPLICATION_JSON).content(request))
            .andExpect(status().isNoContent)
        refresh(token, 401)
    }

    @Test
    fun `concurrent refresh requests cannot both use the same token`() {
        val token = login().path("refreshToken").asText()
        val ready = CountDownLatch(2)
        val start = CountDownLatch(1)
        val executor = Executors.newFixedThreadPool(2)
        try {
            val results = (1..2).map {
                executor.submit<Int> {
                    ready.countDown()
                    start.await(10, TimeUnit.SECONDS)
                    mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("""{"refreshToken":"$token"}""")).andReturn().response.status
                }
            }
            assertTrue(ready.await(10, TimeUnit.SECONDS))
            start.countDown()
            val statuses = results.map { it.get(30, TimeUnit.SECONDS) }
            assertEquals(listOf(200, 401), statuses.sorted())
            assertFalse(refreshTokens.findAll().any { it.revokedAt == null })
        } finally {
            executor.shutdownNow()
        }
    }

    private fun login() = mapper.readTree(
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("""{"email":"ana@example.com","password":"Password123!"}"""))
            .andExpect(status().isOk).andReturn().response.contentAsString
    )

    private fun refresh(token: String, expectedStatus: Int) = mapper.readTree(
        mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
            .content("""{"refreshToken":"$token"}"""))
            .andExpect(status().`is`(expectedStatus)).andReturn().response.contentAsString
    )
}
