package com.syndetis.auth.service

import com.syndetis.auth.model.entity.RefreshToken
import com.syndetis.auth.repository.RefreshTokenRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.Base64
import java.util.UUID

data class RotatedRefreshToken(val userId: UUID, val value: String)

@Service
class RefreshTokenStore(
    private val repository: RefreshTokenRepository,
    @Value("\${auth.refresh-token.ttl-days:30}") private val ttlDays: Long = 30,
) {
    private val random = SecureRandom()

    init {
        require(ttlDays in 1..90) { "Refresh token TTL deve estar entre 1 e 90 dias" }
    }

    @Transactional
    fun issue(userId: UUID): String = create(userId, UUID.randomUUID(), Instant.now())

    @Transactional
    fun rotate(rawToken: String): RotatedRefreshToken? {
        val token = findLocked(rawToken) ?: return null
        val now = Instant.now()
        if (token.revokedAt != null || !token.expiresAt.isAfter(now)) {
            repository.revokeFamily(token.familyId, now)
            return null
        }

        token.revokedAt = now
        val next = create(token.userId, token.familyId, now)
        return RotatedRefreshToken(token.userId, next)
    }

    @Transactional
    fun logout(rawToken: String) {
        val token = findLocked(rawToken) ?: return
        repository.revokeFamily(token.familyId, Instant.now())
    }

    private fun create(userId: UUID, familyId: UUID, now: Instant): String {
        val bytes = ByteArray(32)
        random.nextBytes(bytes)
        val rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
        repository.save(
            RefreshToken(
                userId = userId,
                familyId = familyId,
                tokenHash = hash(rawToken),
                createdAt = now,
                expiresAt = now.plus(ttlDays, ChronoUnit.DAYS),
            )
        )
        return rawToken
    }

    private fun findLocked(rawToken: String): RefreshToken? =
        rawToken.takeIf { TOKEN_PATTERN.matches(it) }
            ?.let { repository.lockByHash(hash(it)) }

    private fun hash(rawToken: String): String = MessageDigest.getInstance("SHA-256")
        .digest(rawToken.toByteArray(Charsets.US_ASCII))
        .joinToString("") { "%02x".format(it.toInt() and 0xff) }

    private companion object {
        val TOKEN_PATTERN = Regex("^[A-Za-z0-9_-]{43}$")
    }
}
