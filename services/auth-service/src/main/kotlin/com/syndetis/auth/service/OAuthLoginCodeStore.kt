package com.syndetis.auth.service

import com.syndetis.auth.model.dto.LoginResponseDto
import com.syndetis.auth.model.entity.OAuthLoginCode
import com.syndetis.auth.repository.OAuthLoginCodeRepository
import com.syndetis.auth.repository.UserRepository
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.Base64
import java.util.UUID

@Service
class OAuthLoginCodeStore(
    private val codes: OAuthLoginCodeRepository,
    private val users: UserRepository,
    private val tokens: AuthTokenService,
) {
    private val random = SecureRandom()

    @Transactional
    fun issue(userId: UUID): String {
        val bytes = ByteArray(32).also(random::nextBytes)
        val raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
        codes.save(OAuthLoginCode(userId = userId, codeHash = hash(raw), expiresAt = Instant.now().plus(60, ChronoUnit.SECONDS)))
        return raw
    }

    @Transactional
    fun exchange(raw: String): LoginResponseDto {
        if (!TOKEN_PATTERN.matches(raw)) throw BadCredentialsException("Código inválido")
        val code = codes.lockByHash(hash(raw)) ?: throw BadCredentialsException("Código inválido")
        val now = Instant.now()
        if (code.consumedAt != null || !code.expiresAt.isAfter(now)) throw BadCredentialsException("Código inválido")
        code.consumedAt = now
        val user = users.findById(code.userId).orElseThrow { BadCredentialsException("Código inválido") }
        return tokens.issue(user)
    }

    private fun hash(value: String): String = MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray(Charsets.US_ASCII))
        .joinToString("") { "%02x".format(it.toInt() and 0xff) }

    private companion object { val TOKEN_PATTERN = Regex("^[A-Za-z0-9_-]{43}$") }
}
