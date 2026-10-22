package com.syndetis.auth.service

import com.syndetis.auth.model.dto.LoginRequestDto
import com.syndetis.auth.model.dto.LoginResponseDto
import com.syndetis.auth.model.dto.RegisterRequestDto
import com.syndetis.auth.model.dto.RegisterResponseDto
import com.syndetis.auth.exception.DuplicateEmailException
import com.syndetis.auth.exception.InvalidCredentialsException
import com.syndetis.auth.model.entity.User
import com.syndetis.auth.model.enum.Role
import com.syndetis.auth.repository.UserRepository
import jakarta.transaction.Transactional
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import java.util.Locale

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val tokens: AuthTokenService
) {
    fun login(dto: LoginRequestDto): LoginResponseDto {
        val user = userRepository.findByEmailIgnoreCase(dto.email.trim())
            ?: throw InvalidCredentialsException()

        if (user.password == null || !passwordEncoder.matches(dto.password, user.password)) {
            throw InvalidCredentialsException()
        }

        return tokens.issue(user)
    }
    @Transactional
    fun register(dto: RegisterRequestDto): RegisterResponseDto {
        val email = dto.email.trim().lowercase(Locale.ROOT)
        if (userRepository.findByEmailIgnoreCase(email) != null) {
            throw DuplicateEmailException()
        }

        val newUser = User(
            firstName = dto.firstName,
            email = email,
            password = passwordEncoder.encode(dto.password),
            role = Role.CUSTOMER
        )

        val savedUser = try {
            userRepository.saveAndFlush(newUser)
        } catch (exception: DataIntegrityViolationException) {
            throw DuplicateEmailException()
        }

        return RegisterResponseDto(
            id = savedUser.id,
            firstName = savedUser.firstName,
            email = savedUser.email,
            role = savedUser.role
        )
    }
}
