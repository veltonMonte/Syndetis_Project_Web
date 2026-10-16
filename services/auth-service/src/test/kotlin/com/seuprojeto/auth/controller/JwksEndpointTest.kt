package com.seuprojeto.auth.controller

import com.seuprojeto.auth.config.RsaKeyConfig
import com.seuprojeto.auth.config.SecurityConfig
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@WebMvcTest(JwksController::class)
@Import(SecurityConfig::class, RsaKeyConfig::class)
class JwksEndpointTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Test
    fun `jwks endpoint is public and exposes only public key parameters`() {
        val result = mockMvc.perform(
            get("/.well-known/jwks.json")
                .accept(MediaType.APPLICATION_JSON)
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.keys").isArray)
            .andExpect(jsonPath("$.keys[0].kty").value("RSA"))
            .andExpect(jsonPath("$.keys[0].kid").isNotEmpty)
            .andExpect(jsonPath("$.keys[0].n").isNotEmpty)
            .andExpect(jsonPath("$.keys[0].e").isNotEmpty)
            .andReturn()

        val jsonString = result.response.contentAsString

        // Verifica que parâmetros privados da chave RSA JAMAIS vazam no endpoint público
        val privateParameters = listOf("d", "p", "q", "dp", "dq", "qi", "dmp1", "dmq1")
        for (param in privateParameters) {
            assertFalse(
                jsonString.contains("\"$param\":"),
                "O parâmetro privado RSA '$param' não deve estar presente no JWKS público!"
            )
        }
    }
}
