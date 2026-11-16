package com.syndetis.auth.controller

import com.syndetis.auth.config.SecurityConfig
import com.syndetis.auth.model.dto.LoginRequestDto
import com.syndetis.auth.model.dto.LoginResponseDto
import com.syndetis.auth.service.AuthService
import com.syndetis.auth.service.AuthTokenService
import com.syndetis.auth.service.OAuthLoginCodeStore
import org.junit.jupiter.api.Test
import org.mockito.Mockito.*
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@WebMvcTest(AuthController::class)
@Import(SecurityConfig::class)
class PasswordValidationTest {
    @Autowired private lateinit var mvc: MockMvc
    @MockitoBean private lateinit var auth: AuthService
    @MockitoBean private lateinit var tokens: AuthTokenService
    @MockitoBean private lateinit var codes: OAuthLoginCodeStore

    @Test fun `oversized ascii and unicode passwords never reach authentication service`() {
        for (password in listOf("a".repeat(73), "é".repeat(37), "a".repeat(69) + "😀", "a".repeat(500000))) {
            for (route in listOf("login", "register")) {
                mvc.perform(post("/api/auth/$route").contentType(MediaType.APPLICATION_JSON)
                    .content("""{"firstName":"Test","email":"test@example.com","password":"$password"}"""))
                    .andExpect(status().isBadRequest)
            }
        }
        verifyNoInteractions(auth, tokens, codes)
    }
    @Test fun `registration rejects short and blank passwords before hashing`() {
        for (password in listOf("1234567", "", "        ")) {
            mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("""{"firstName":"Test","email":"test@example.com","password":"$password"}"""))
                .andExpect(status().isBadRequest)
        }
        verifyNoInteractions(auth, tokens, codes)
    }
    @Test fun `login accepts exactly 72 utf8 bytes and preserves legacy short passwords`() {
        for (password in listOf("a".repeat(72), "é".repeat(36), "a".repeat(68) + "😀", "short")) {
            val dto = LoginRequestDto("test@example.com", password)
            `when`(auth.login(dto)).thenReturn(LoginResponseDto("access", "refresh", expiresIn = 600))
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("""{"email":"test@example.com","password":"$password"}"""))
                .andExpect(status().isOk)
            verify(auth).login(dto)
        }
    }
}
