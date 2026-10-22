package com.seuprojeto.auth

import com.seuprojeto.auth.model.enum.Role
import com.seuprojeto.auth.repository.UserRepository
import com.seuprojeto.auth.service.JwtService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNotNull
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
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
@Transactional
class RegisterIntegrationTest {

    companion object {
        @Container
        @ServiceConnection
        val postgres = PostgreSQLContainer("postgres:16-alpine")
    }

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var passwordEncoder: PasswordEncoder

    @Autowired
    private lateinit var jwtService: JwtService

    @BeforeEach
    fun setUp() {
        userRepository.deleteAll()
    }

    @Test
    fun `anonymous client cannot escalate privileges to ADMIN via register`() {
        val payloadWithAdminRole = """
            {
                "firstName": "Attacker",
                "email": "attacker@example.com",
                "password": "Password123!",
                "role": "ADMIN"
            }
        """.trimIndent()

        // 1. O cadastro deve ignorar o campo 'role' e atribuir CUSTOMER
        val registerResponse = mockMvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payloadWithAdminRole)
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.email").value("attacker@example.com"))
            .andExpect(jsonPath("$.role").value("CUSTOMER"))
            .andReturn()

        // 2. O usuário no banco de dados deve ter role CUSTOMER
        val savedUser = userRepository.findByEmail("attacker@example.com")
        assertNotNull(savedUser)
        assertEquals(Role.CUSTOMER, savedUser!!.role)

        // 3. Fazer login com a conta criada e inspecionar o JWT
        val loginPayload = """
            {
                "email": "attacker@example.com",
                "password": "Password123!"
            }
        """.trimIndent()

        val loginResponse = mockMvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginPayload)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.accessToken").isNotEmpty)
            .andReturn()

        val responseBody = loginResponse.response.contentAsString
        val token = responseBody.substringAfter("\"accessToken\":\"").substringBefore("\"")

        // 4. Inspecionar claim 'role' no JWT emitido externamente
        val claims = jwtService.validateToken(token)
        assertNotNull(claims)
        assertEquals("CUSTOMER", claims!!["role"])
        assertEquals("http://localhost:8081", claims.issuer)
        assertTrue(claims.audience.contains("syndetis"))
    }

    @Test
    fun `normal customer registration succeeds and stores password with BCrypt`() {
        val payload = """
            {
                "firstName": "Maria",
                "email": "maria@example.com",
                "password": "SecurePassword123!"
            }
        """.trimIndent()

        mockMvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload)
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.email").value("maria@example.com"))
            .andExpect(jsonPath("$.role").value("CUSTOMER"))

        val savedUser = userRepository.findByEmail("maria@example.com")
        assertNotNull(savedUser)
        assertEquals(Role.CUSTOMER, savedUser!!.role)
        assertNotEquals("SecurePassword123!", savedUser.password)
        assertTrue(passwordEncoder.matches("SecurePassword123!", savedUser.password))
        assertTrue(savedUser.password!!.startsWith("${'$'}2a${'$'}") || savedUser.password!!.startsWith("${'$'}2b${'$'}"))
    }

    @Test
    fun `registration with duplicated email is rejected`() {
        val payload = """
            {
                "firstName": "Carlos",
                "email": "carlos@example.com",
                "password": "Password123!"
            }
        """.trimIndent()

        // Primeiro cadastro deve passar
        mockMvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload)
        ).andExpect(status().isCreated)

        // Segundo cadastro com mesmo email deve retornar conflito.
        mockMvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload)
        ).andExpect(status().isConflict)
    }
}
