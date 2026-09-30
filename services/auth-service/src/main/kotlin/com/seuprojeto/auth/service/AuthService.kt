package com.seuprojeto.auth.service

import com.seuprojeto.auth.model.dto.LoginRequestDto
import com.seuprojeto.auth.model.dto.LoginResponseDto
import com.seuprojeto.auth.repository.UserRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val jwtService: JwtService
) {
    fun login(dto: LoginRequestDto): LoginResponseDto {
        val user = userRepository.findByEmail(dto.email)
            ?: throw RuntimeException("Credenciais inválidas")

        if (!passwordEncoder.matches(dto.password, user.password)) {
            throw RuntimeException("Credenciais inválidas")
        }

        val token = jwtService.generateToken(user)

        return LoginResponseDto(
            accessToken = token,
            tokenType = "Bearer",
            expiresIn = 86400L
        )
    }
}