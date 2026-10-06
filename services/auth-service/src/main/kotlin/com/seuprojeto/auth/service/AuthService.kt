package com.seuprojeto.auth.service

import com.seuprojeto.auth.model.dto.LoginRequestDto
import com.seuprojeto.auth.model.dto.LoginResponseDto
import com.seuprojeto.auth.model.dto.RegisterRequestDto
import com.seuprojeto.auth.model.dto.RegisterResponseDto
import com.seuprojeto.auth.model.entity.User
import com.seuprojeto.auth.repository.UserRepository
import jakarta.transaction.Transactional
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
    @Transactional
    fun register(dto: RegisterRequestDto): RegisterResponseDto {
        if (userRepository.findByEmail(dto.email) != null) {
            throw RuntimeException("Email já existente")
        }

        val newUser = User(
            firstName = dto.firstName,
            email = dto.email,
            password = passwordEncoder.encode(dto.password),
            role = dto.role
        )

        val savedUser = userRepository.save(newUser)

        return RegisterResponseDto(
            id = savedUser.id,
            firstName = savedUser.firstName,
            email = savedUser.email,
            role = savedUser.role
        )
    }
}
