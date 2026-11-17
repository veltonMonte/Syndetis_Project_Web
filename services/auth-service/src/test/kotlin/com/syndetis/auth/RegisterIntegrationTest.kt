package com.syndetis.auth

import com.syndetis.auth.document.TaxIdRecord
import com.syndetis.auth.document.TaxIdVerifier
import com.syndetis.auth.exception.DocumentCheckUnavailableException
import com.syndetis.auth.model.enum.Role
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.Primary
import com.syndetis.auth.repository.UserRepository
import com.syndetis.auth.service.JwtService
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
@Import(RegisterIntegrationTest.FakeReceita::class)
@Testcontainers(disabledWithoutDocker = true)
@Transactional
class RegisterIntegrationTest {

    companion object {
        @Container
        @ServiceConnection
        val postgres = PostgreSQLContainer("postgres:16-alpine")

        /** What the Receita Federal answers in each test (the integration-hub is not running). */
        var receita: (String) -> TaxIdRecord = { digits -> TaxIdRecord(type = "CNPJ", document = digits, status = "ACTIVE") }
    }

    @TestConfiguration
    class FakeReceita {
        @Bean
        @Primary
        fun fakeTaxIdVerifier() = TaxIdVerifier { digits -> receita(digits) }
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
    fun `Syndetis signup creates a merchant and still ignores a role sent by the client`() {
        receita = { digits -> TaxIdRecord(type = "CNPJ", document = digits, status = "ACTIVE", name = "LIA ME", mei = true) }
        val payload = """{"firstName":"Lia","email":"lia@example.com","password":"SecurePassword123!","role":"ADMIN","document":"33.000.167/0001-01"}"""

        mockMvc.perform(post("/api/auth/register/seller").contentType(MediaType.APPLICATION_JSON).content(payload))
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.role").value("SELLER"))
        val seller = userRepository.findByEmail("lia@example.com")!!
        assertEquals(Role.SELLER, seller.role)
        assertEquals("33.000.167/0001-01", seller.documentDisplay)
        assertEquals(true, seller.mei)

        // The merchant's access token says the document is confirmed.
        val login = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("""{"email":"lia@example.com","password":"SecurePassword123!"}""")).andReturn().response.contentAsString
        assertEquals(true, jwtService.validateToken(login.substringAfter("\"accessToken\":\"").substringBefore("\""))!!["doc_verified"])

        // The same e-mail cannot also become a storefront buyer account.
        mockMvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(payload))
            .andExpect(status().isConflict)
        // Nor can the same CNPJ open a second merchant account.
        mockMvc.perform(post("/api/auth/register/seller").contentType(MediaType.APPLICATION_JSON)
            .content(payload.replace("lia@", "lia2@")))
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.errors.document").exists())
    }

    @Test
    fun `a merchant account exists only for an active CNPJ, never for a CPF`() {
        val payload = """{"firstName":"Rui","email":"rui@example.com","password":"SecurePassword123!","document":"11.222.333/0001-81"}"""
        // A CPF is refused before the Receita Federal is asked.
        var asked = 0
        receita = { digits -> asked++; TaxIdRecord(type = "CNPJ", document = digits, status = "ACTIVE") }
        mockMvc.perform(post("/api/auth/register/seller").contentType(MediaType.APPLICATION_JSON)
            .content(payload.replace("11.222.333/0001-81", "404.428.201-35")))
            .andExpect(status().`is`(422))
            .andExpect(jsonPath("$.errors.document").value("Contas de lojista usam o CNPJ da loja, não CPF."))
        assertEquals(0, asked)

        receita = { digits -> TaxIdRecord(type = "CNPJ", document = digits, status = "INACTIVE", registrationStatus = "BAIXADA") }
        mockMvc.perform(post("/api/auth/register/seller").contentType(MediaType.APPLICATION_JSON).content(payload))
            .andExpect(status().`is`(422))
            .andExpect(jsonPath("$.errors.document").exists())
        receita = { _ -> throw DocumentCheckUnavailableException() }
        mockMvc.perform(post("/api/auth/register/seller").contentType(MediaType.APPLICATION_JSON).content(payload))
            .andExpect(status().isServiceUnavailable)
        // Without a document there is no merchant account at all.
        mockMvc.perform(post("/api/auth/register/seller").contentType(MediaType.APPLICATION_JSON)
            .content("""{"firstName":"Rui","email":"rui@example.com","password":"SecurePassword123!"}"""))
            .andExpect(status().isBadRequest)
        assertEquals(null, userRepository.findByEmail("rui@example.com"))

        receita = { digits -> TaxIdRecord(type = "CNPJ", document = digits, status = "ACTIVE", name = "RUI ME", mei = true) }
        mockMvc.perform(post("/api/auth/register/seller").contentType(MediaType.APPLICATION_JSON).content(payload))
            .andExpect(status().isCreated)
        val rui = userRepository.findByEmail("rui@example.com")!!
        assertEquals("11.222.333/0001-81", rui.documentDisplay)
        assertEquals(true, rui.mei)
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
