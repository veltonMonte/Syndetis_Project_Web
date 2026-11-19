package com.syndetis.auth

import com.syndetis.auth.document.TaxIdRecord
import com.syndetis.auth.document.TaxIdVerifier
import com.syndetis.auth.model.entity.User
import com.syndetis.auth.model.enum.LegalAcceptanceOrigin
import com.syndetis.auth.model.enum.Role
import com.syndetis.auth.repository.LegalAcceptanceRepository
import com.syndetis.auth.repository.UserRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
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
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer

/** Merchants accept the Terms of Use and the Privacy Policy, and the acceptance is recorded with its version. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(LegalAcceptanceIntegrationTest.FakeReceita::class)
@Testcontainers(disabledWithoutDocker = true)
@Transactional
class LegalAcceptanceIntegrationTest {

    companion object {
        @Container
        @ServiceConnection
        val postgres = PostgreSQLContainer("postgres:16-alpine")

        var receitaCalls = 0
        const val VERSION = "2026-11-18"
    }

    @TestConfiguration
    class FakeReceita {
        @Bean
        @Primary
        fun fakeTaxIdVerifier() = TaxIdVerifier { digits, _ ->
            receitaCalls++
            TaxIdRecord(type = "CNPJ", document = digits, status = "ACTIVE", name = "LOJA ME")
        }
    }

    @Autowired private lateinit var mockMvc: MockMvc
    @Autowired private lateinit var users: UserRepository
    @Autowired private lateinit var acceptances: LegalAcceptanceRepository
    @Autowired private lateinit var passwordEncoder: PasswordEncoder

    private val account = """"firstName":"Ana","email":"ana@example.com","password":"SecurePassword123!","document":"33.000.167/0001-01""""

    @BeforeEach
    fun setUp() {
        acceptances.deleteAll()
        users.deleteAll()
        receitaCalls = 0
    }

    private fun signup(body: String) =
        mockMvc.perform(post("/api/auth/register/seller").contentType(MediaType.APPLICATION_JSON).content(body))

    private fun login(email: String): String =
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("""{"email":"$email","password":"SecurePassword123!"}"""))
            .andExpect(status().isOk)
            .andReturn().response.contentAsString
            .substringAfter("\"accessToken\":\"").substringBefore("\"")

    @Test
    fun `the versions in force are public`() {
        mockMvc.perform(get("/api/auth/legal"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.termsVersion").value(VERSION))
            .andExpect(jsonPath("$.privacyVersion").value(VERSION))
    }

    @Test
    fun `a merchant account is not created without accepting the terms`() {
        signup("{$account}")
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.errors.acceptedTermsVersion").exists())
        assertNull(users.findByEmail("ana@example.com"))
    }

    @Test
    fun `a signup on an older text is asked to reload, before any Receita Federal query`() {
        signup("""{$account,"acceptedTermsVersion":"2026-01-01","acceptedPrivacyVersion":"$VERSION"}""")
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.errors.legal").exists())
        assertNull(users.findByEmail("ana@example.com"))
        assertEquals(0, receitaCalls)
    }

    @Test
    fun `the signup records the accepted versions with the account`() {
        signup("""{$account,"acceptedTermsVersion":"$VERSION","acceptedPrivacyVersion":"$VERSION"}""")
            .andExpect(status().isCreated)
        val seller = users.findByEmail("ana@example.com")!!
        val recorded = acceptances.findFirstByUserIdOrderByAcceptedAtDesc(seller.id!!)!!
        assertEquals(VERSION, recorded.termsVersion)
        assertEquals(VERSION, recorded.privacyVersion)
        assertEquals(LegalAcceptanceOrigin.SIGNUP, recorded.origin)

        mockMvc.perform(get("/api/auth/me/legal").header("Authorization", "Bearer " + login("ana@example.com")))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.pending").value(false))
            .andExpect(jsonPath("$.acceptedTermsVersion").value(VERSION))
    }

    @Test
    fun `an account created without the form accepts inside the app`() {
        // Like a Google/GitHub signup: the account exists before any acceptance.
        users.saveAndFlush(User(firstName = "Bia", email = "bia@example.com",
            password = passwordEncoder.encode("SecurePassword123!"), role = Role.SELLER))
        val bearer = "Bearer " + login("bia@example.com")

        mockMvc.perform(get("/api/auth/me/legal").header("Authorization", bearer))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.pending").value(true))
            .andExpect(jsonPath("$.acceptedAt").doesNotExist())

        val accept = post("/api/auth/me/legal").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
            .content("""{"termsVersion":"$VERSION","privacyVersion":"$VERSION"}""")
        mockMvc.perform(accept).andExpect(status().isOk).andExpect(jsonPath("$.pending").value(false))
        mockMvc.perform(accept).andExpect(status().isOk)

        val seller = users.findByEmail("bia@example.com")!!
        assertEquals(1, acceptances.findAll().count { it.userId == seller.id })
        assertEquals(LegalAcceptanceOrigin.IN_APP, acceptances.findFirstByUserIdOrderByAcceptedAtDesc(seller.id!!)!!.origin)
    }

    @Test
    fun `acceptance needs a valid token`() {
        mockMvc.perform(get("/api/auth/me/legal")).andExpect(status().isUnauthorized)
        mockMvc.perform(post("/api/auth/me/legal").header("Authorization", "Bearer nope").contentType(MediaType.APPLICATION_JSON)
            .content("""{"termsVersion":"$VERSION","privacyVersion":"$VERSION"}"""))
            .andExpect(status().isUnauthorized)
    }
}
