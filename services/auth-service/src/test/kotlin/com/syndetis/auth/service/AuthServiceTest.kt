package com.syndetis.auth.service

import com.syndetis.auth.model.dto.LoginRequestDto
import com.syndetis.auth.model.dto.LoginResponseDto
import com.syndetis.auth.model.dto.RegisterRequestDto
import com.syndetis.auth.model.entity.User
import com.syndetis.auth.model.enum.Role
import com.syndetis.auth.repository.UserRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentCaptor
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.springframework.security.crypto.password.PasswordEncoder
import java.util.UUID

class AuthServiceTest {

    private lateinit var userRepository: UserRepository
    private lateinit var passwordEncoder: PasswordEncoder
    private lateinit var tokens: AuthTokenService
    private lateinit var authService: AuthService

    @BeforeEach
    fun setUp() {
        userRepository = mock(UserRepository::class.java)
        passwordEncoder = mock(PasswordEncoder::class.java)
        tokens = mock(AuthTokenService::class.java)
        authService = AuthService(userRepository, passwordEncoder, tokens)
    }

    @Test
    fun `register always forces CUSTOMER role on server side`() {
        val dto = RegisterRequestDto(
            firstName = "Lucas",
            email = "lucas@example.com",
            password = "rawPassword"
        )

        `when`(userRepository.findByEmailIgnoreCase("lucas@example.com")).thenReturn(null)
        `when`(passwordEncoder.encode("rawPassword")).thenReturn("hashedPassword")

        val expectedSavedUser = User(
            id = UUID.randomUUID(),
            firstName = "Lucas",
            email = "lucas@example.com",
            password = "hashedPassword",
            role = Role.CUSTOMER
        )

        val userCaptor = ArgumentCaptor.forClass(User::class.java)
        `when`(userRepository.saveAndFlush(userCaptor.capture())).thenReturn(expectedSavedUser)

        val response = authService.register(dto)

        assertEquals("Lucas", response.firstName)
        assertEquals("lucas@example.com", response.email)
        assertEquals(Role.CUSTOMER, response.role)

        val capturedUser = userCaptor.value
        assertEquals("Lucas", capturedUser.firstName)
        assertEquals("lucas@example.com", capturedUser.email)
        assertEquals("hashedPassword", capturedUser.password)
        assertEquals(Role.CUSTOMER, capturedUser.role)
    }

    @Test
    fun `register throws RuntimeException when email already exists`() {
        val dto = RegisterRequestDto(
            firstName = "Lucas",
            email = "lucas@example.com",
            password = "rawPassword"
        )

        val existingUser = User(
            firstName = "Lucas",
            email = "lucas@example.com",
            password = "hashedPassword",
            role = Role.CUSTOMER
        )
        `when`(userRepository.findByEmailIgnoreCase("lucas@example.com")).thenReturn(existingUser)

        val exception = assertThrows(RuntimeException::class.java) {
            authService.register(dto)
        }

        assertEquals("E-mail já cadastrado", exception.message)
    }

    @Test
    fun `login succeeds with valid credentials`() {
        val loginDto = LoginRequestDto(
            email = "lucas@example.com",
            password = "plainPassword"
        )

        val user = User(
            id = UUID.randomUUID(),
            firstName = "Lucas",
            email = "lucas@example.com",
            password = "hashedPassword",
            role = Role.CUSTOMER
        )

        `when`(userRepository.findByEmailIgnoreCase("lucas@example.com")).thenReturn(user)
        `when`(passwordEncoder.matches("plainPassword", "hashedPassword")).thenReturn(true)
        `when`(tokens.issue(user)).thenReturn(LoginResponseDto("mocked.jwt.token", "opaque-refresh-token", expiresIn = 600))

        val response = authService.login(loginDto)

        assertNotNull(response)
        assertEquals("mocked.jwt.token", response.accessToken)
        assertEquals("Bearer", response.tokenType)
        assertEquals(600L, response.expiresIn)
        assertEquals("opaque-refresh-token", response.refreshToken)
    }

    @Test
    fun `login fails when user not found or password incorrect`() {
        val loginDto = LoginRequestDto(
            email = "nonexistent@example.com",
            password = "plainPassword"
        )

        `when`(userRepository.findByEmailIgnoreCase("nonexistent@example.com")).thenReturn(null)

        val notFoundException = assertThrows(RuntimeException::class.java) {
            authService.login(loginDto)
        }
        assertEquals("Credenciais inválidas", notFoundException.message)

        val user = User(
            firstName = "Lucas",
            email = "lucas@example.com",
            password = "hashedPassword",
            role = Role.CUSTOMER
        )
        `when`(userRepository.findByEmailIgnoreCase("lucas@example.com")).thenReturn(user)
        `when`(passwordEncoder.matches("wrongPassword", "hashedPassword")).thenReturn(false)

        val wrongPassDto = LoginRequestDto(
            email = "lucas@example.com",
            password = "wrongPassword"
        )
        val wrongPassException = assertThrows(RuntimeException::class.java) {
            authService.login(wrongPassDto)
        }
        assertEquals("Credenciais inválidas", wrongPassException.message)
    }
}
