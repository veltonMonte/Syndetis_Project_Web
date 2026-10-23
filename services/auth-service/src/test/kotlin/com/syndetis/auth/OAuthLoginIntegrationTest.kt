package com.syndetis.auth

import com.syndetis.auth.model.entity.User
import com.syndetis.auth.repository.OAuthAccountRepository
import com.syndetis.auth.repository.OAuthLoginCodeRepository
import com.syndetis.auth.repository.RefreshTokenRepository
import com.syndetis.auth.repository.UserRepository
import com.syndetis.auth.service.OAuthIdentityService
import com.syndetis.auth.service.OAuthLoginCodeStore
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.testcontainers.service.connection.ServiceConnection
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.oauth2.core.oidc.OidcIdToken
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser
import org.springframework.security.oauth2.core.user.DefaultOAuth2User
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer
import tools.jackson.databind.ObjectMapper
import java.time.Instant

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class OAuthLoginIntegrationTest {
    companion object {
        @Container @ServiceConnection val postgres = PostgreSQLContainer("postgres:16-alpine")
    }

    @Autowired private lateinit var users: UserRepository
    @Autowired private lateinit var accounts: OAuthAccountRepository
    @Autowired private lateinit var codes: OAuthLoginCodeRepository
    @Autowired private lateinit var refreshTokens: RefreshTokenRepository
    @Autowired private lateinit var identities: OAuthIdentityService
    @Autowired private lateinit var loginCodes: OAuthLoginCodeStore
    @Autowired private lateinit var mvc: MockMvc
    @Autowired private lateinit var mapper: ObjectMapper

    @BeforeEach
    fun reset() {
        codes.deleteAll()
        refreshTokens.deleteAll()
        accounts.deleteAll()
        users.deleteAll()
    }

    @Test
    fun `verified Google identity creates customer and exchanges code once`() {
        val id = identities.resolve("google", googlePrincipal("person@example.com", true))
        assertEquals(id, identities.resolve("google", googlePrincipal("person@example.com", true)))
        assertEquals("CUSTOMER", users.findById(id).orElseThrow { AssertionError("Usuário ausente") }.role.name)
        assertEquals(null, users.findById(id).orElseThrow { AssertionError("Usuário ausente") }.password)

        val code = loginCodes.issue(id)
        val stored = codes.findAll().single()
        assertNotEquals(code, stored.codeHash)

        val request = """{"code":"$code"}"""
        val response = mvc.perform(post("/api/auth/oauth2/exchange")
            .contentType(MediaType.APPLICATION_JSON).content(request))
            .andExpect(status().isOk).andReturn().response
        assertEquals("no-store", response.getHeader("Cache-Control"))
        assertEquals(600L, mapper.readTree(response.contentAsString).path("expiresIn").asLong())
        mvc.perform(post("/api/auth/oauth2/exchange")
            .contentType(MediaType.APPLICATION_JSON).content(request))
            .andExpect(status().isUnauthorized)
    }

    @Test
    fun `unverified Google address and existing local address cannot create social account`() {
        assertThrows(BadCredentialsException::class.java) {
            identities.resolve("google", googlePrincipal("unverified@example.com", false))
        }
        users.saveAndFlush(User(firstName = "Local", email = "PERSON@example.com", password = "hash"))
        assertThrows(BadCredentialsException::class.java) {
            identities.resolve("google", googlePrincipal("person@example.com", true))
        }
        assertEquals(0L, accounts.count())
    }

    @Test
    fun `GitHub identity requires a verified address and uses immutable provider id`() {
        val principal = DefaultOAuth2User(
            listOf(SimpleGrantedAuthority("OAUTH2_USER")),
            mapOf("id" to 42, "verified_email" to "github@example.com", "name" to "Git Hub"),
            "id",
        )
        val id = identities.resolve("github", principal)
        assertEquals(id, identities.resolve("github", principal))
        assertEquals("github@example.com", users.findById(id).orElseThrow { AssertionError("Usuário ausente") }.email)
    }

    private fun googlePrincipal(email: String, verified: Boolean): DefaultOidcUser {
        val now = Instant.now()
        val idToken = OidcIdToken("id-token", now, now.plusSeconds(300), mapOf(
            "sub" to "google-subject", "email" to email, "email_verified" to verified, "name" to "Pessoa",
        ))
        return DefaultOidcUser(emptyList(), idToken)
    }
}
