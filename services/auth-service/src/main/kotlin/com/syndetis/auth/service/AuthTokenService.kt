package com.syndetis.auth.service

import com.syndetis.auth.exception.InvalidRefreshTokenException
import com.syndetis.auth.model.dto.LoginResponseDto
import com.syndetis.auth.model.entity.User
import com.syndetis.auth.repository.UserRepository
import org.springframework.stereotype.Service

@Service
class AuthTokenService(
    private val jwtService: JwtService,
    private val refreshTokens: RefreshTokenStore,
    private val users: UserRepository,
) {
    fun issue(user: User): LoginResponseDto = response(user, refreshTokens.issue(requireNotNull(user.id)))

    fun refresh(rawToken: String): LoginResponseDto {
        val rotated = refreshTokens.rotate(rawToken) ?: throw InvalidRefreshTokenException()
        val user = users.findById(rotated.userId).orElseThrow { InvalidRefreshTokenException() }
        return response(user, rotated.value)
    }

    fun logout(rawToken: String) = refreshTokens.logout(rawToken)

    private fun response(user: User, refreshToken: String): LoginResponseDto = LoginResponseDto(
        accessToken = jwtService.generateToken(user),
        refreshToken = refreshToken,
        expiresIn = jwtService.expiresInSeconds,
    )
}
