package com.syndetis.auth.service

import com.syndetis.auth.document.ConfirmedDocument
import com.syndetis.auth.document.MerchantDocumentService
import com.syndetis.auth.exception.DuplicateDocumentException
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
    private val tokens: AuthTokenService,
    private val documents: MerchantDocumentService,
) {
    /** Cheap checks first, so a taken e-mail never costs a Receita Federal query. */
    fun ensureEmailAvailable(email: String) {
        if (userRepository.findByEmailIgnoreCase(email.trim()) != null) throw DuplicateEmailException()
    }

    fun login(dto: LoginRequestDto): LoginResponseDto {
        val user = userRepository.findByEmailIgnoreCase(dto.email.trim())
            ?: throw InvalidCredentialsException()

        if (user.password == null || !passwordEncoder.matches(dto.password, user.password)) {
            throw InvalidCredentialsException()
        }

        return tokens.issue(user)
    }
    @Transactional
    /** The role comes from the endpoint (storefront buyer or Syndetis merchant), never from the client. */
    fun register(dto: RegisterRequestDto, role: Role = Role.CUSTOMER, document: ConfirmedDocument? = null): RegisterResponseDto {
        require(role == Role.CUSTOMER || role == Role.SELLER) { "Cadastro público não cria administradores" }
        val email = dto.email.trim().lowercase(Locale.ROOT)
        if (userRepository.findByEmailIgnoreCase(email) != null) {
            throw DuplicateEmailException()
        }

        val newUser = User(
            firstName = dto.firstName,
            email = email,
            password = passwordEncoder.encode(dto.password),
            role = role
        )
        document?.let { documents.apply(newUser, it) }

        val savedUser = try {
            userRepository.saveAndFlush(newUser)
        } catch (exception: DataIntegrityViolationException) {
            // Two signups racing for the same CNPJ hit the unique index on the document hash.
            if (exception.mostSpecificCause.message?.contains("ux_users_document_hash") == true) throw DuplicateDocumentException()
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
