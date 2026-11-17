package com.syndetis.core.payment

import com.syndetis.core.exception.BusinessRuleException
import com.syndetis.core.exception.ServiceUnavailableException
import com.syndetis.core.security.CurrentUser
import com.syndetis.core.security.StoreAccessGuard
import org.slf4j.LoggerFactory
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.security.SecureRandom
import java.sql.Timestamp
import java.time.Duration
import java.time.Instant
import java.util.Base64
import java.util.UUID

/** What the merchant sees about the connected Mercado Pago account (never a token). */
data class PaymentAccountStatus(
    val available: Boolean,
    val connected: Boolean,
    val nickname: String? = null,
    val liveMode: Boolean? = null,
    val connectedAt: Instant? = null,
)

data class AuthorizationResponse(val authorizationUrl: String)

/**
 * The merchant's Mercado Pago account, connected with OAuth from the store dashboard: Syndetis sends the
 * merchant to Mercado Pago, which sends back a code that becomes the store's own token. Payments are then
 * created with that token, so the money lands in the merchant's account without anyone copying an API key.
 */
@Service
class MercadoPagoAccountService(
    private val jdbc: JdbcTemplate,
    private val cipher: TokenCipher,
    private val hub: MercadoPagoOAuthClient,
    private val access: StoreAccessGuard,
    private val currentUser: CurrentUser,
) {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val random = SecureRandom()

    @Transactional(readOnly = true)
    fun status(storeId: UUID): PaymentAccountStatus {
        access.forManage(storeId)
        val available = runCatching { hub.configured() }.getOrDefault(false)
        return jdbc.query("SELECT nickname, live_mode, connected_at FROM store_payment_accounts WHERE store_id = ?", { rs, _ ->
            PaymentAccountStatus(available, true, rs.getString("nickname"), rs.getBoolean("live_mode"), rs.getTimestamp("connected_at").toInstant())
        }, storeId).firstOrNull() ?: PaymentAccountStatus(available, false)
    }

    /** Starts the connection: a single-use state bound to this store and merchant, with a PKCE verifier. */
    @Transactional
    fun authorize(storeId: UUID): AuthorizationResponse {
        access.forManage(storeId)
        if (!hub.configured()) throw ServiceUnavailableException("A conexão com o Mercado Pago ainda não está disponível na plataforma.")
        val state = randomToken(32)
        val verifier = randomToken(48)
        val challenge = Base64.getUrlEncoder().withoutPadding().encodeToString(sha256(verifier.toByteArray()))
        jdbc.update("DELETE FROM payment_oauth_states WHERE expires_at < now()")
        jdbc.update("INSERT INTO payment_oauth_states (state_hash, store_id, user_id, code_verifier_enc, expires_at) VALUES (?, ?, ?, ?, ?)",
            hex(state), storeId, currentUser.id(), cipher.encrypt(verifier), Timestamp.from(Instant.now().plus(STATE_TTL)))
        return AuthorizationResponse(hub.authorizationUrl(state, challenge))
    }

    /**
     * Mercado Pago's redirect back. The state is consumed whatever happens next, so a code can be redeemed once.
     * Returns where to send the merchant: the dashboard, with the outcome in the address.
     */
    fun callback(code: String?, state: String?, error: String?): String {
        if (state.isNullOrBlank() || state.length > 200) return DASHBOARD + "erro"
        val claim = jdbc.query("DELETE FROM payment_oauth_states WHERE state_hash = ? RETURNING store_id, code_verifier_enc, expires_at", { rs, _ ->
            Triple(UUID.fromString(rs.getString("store_id")), rs.getString("code_verifier_enc"), rs.getTimestamp("expires_at").toInstant())
        }, hex(state)).firstOrNull() ?: return DASHBOARD + "erro"
        val (storeId, verifier, expiresAt) = claim
        if (!error.isNullOrBlank()) return DASHBOARD + "cancelado"
        if (code.isNullOrBlank() || code.length > 500 || expiresAt.isBefore(Instant.now())) return DASHBOARD + "erro"
        return try {
            save(storeId, hub.exchange(code, cipher.decrypt(verifier)))
            DASHBOARD + "conectado"
        } catch (exception: Exception) {
            logger.warn("Conexão do Mercado Pago falhou para a loja {}: {}", storeId, exception.javaClass.simpleName)
            DASHBOARD + "erro"
        }
    }

    @Transactional
    fun disconnect(storeId: UUID) {
        access.forManage(storeId)
        jdbc.update("DELETE FROM store_payment_accounts WHERE store_id = ?", storeId)
    }

    /**
     * The store's token for a payment, renewed when it is close to expiring. Null when the store has not
     * connected an account (the platform account is used, as before).
     */
    fun accessTokenFor(storeId: UUID): String? {
        val row = jdbc.query("SELECT access_token_enc, refresh_token_enc, expires_at FROM store_payment_accounts WHERE store_id = ?", { rs, _ ->
            Triple(rs.getString("access_token_enc"), rs.getString("refresh_token_enc"), rs.getTimestamp("expires_at").toInstant())
        }, storeId).firstOrNull() ?: return null
        val (accessToken, refreshToken, expiresAt) = row
        if (expiresAt.isAfter(Instant.now().plus(REFRESH_BEFORE))) return cipher.decrypt(accessToken)
        return try {
            val renewed = hub.refresh(cipher.decrypt(refreshToken))
            save(storeId, renewed)
            renewed.accessToken
        } catch (exception: Exception) {
            if (expiresAt.isAfter(Instant.now())) return cipher.decrypt(accessToken)
            throw BusinessRuleException("A conta do Mercado Pago desta loja precisa ser conectada de novo.")
        }
    }

    private fun save(storeId: UUID, account: MercadoPagoAccount) {
        jdbc.update("""
            INSERT INTO store_payment_accounts (store_id, provider_user_id, nickname, access_token_enc, refresh_token_enc,
                public_key, live_mode, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (store_id) DO UPDATE SET provider_user_id = EXCLUDED.provider_user_id, nickname = EXCLUDED.nickname,
                access_token_enc = EXCLUDED.access_token_enc, refresh_token_enc = EXCLUDED.refresh_token_enc,
                public_key = EXCLUDED.public_key, live_mode = EXCLUDED.live_mode, expires_at = EXCLUDED.expires_at, updated_at = now()
        """, storeId, account.userId, account.nickname?.take(80), cipher.encrypt(account.accessToken), cipher.encrypt(account.refreshToken),
            account.publicKey?.take(200), account.liveMode, Timestamp.from(Instant.now().plusSeconds(account.expiresIn)))
    }

    private fun randomToken(bytes: Int) = Base64.getUrlEncoder().withoutPadding().encodeToString(ByteArray(bytes).also(random::nextBytes))
    private fun sha256(value: ByteArray) = MessageDigest.getInstance("SHA-256").digest(value)
    private fun hex(value: String) = sha256(value.toByteArray()).joinToString("") { "%02x".format(it) }

    private companion object {
        val STATE_TTL: Duration = Duration.ofMinutes(10)
        val REFRESH_BEFORE: Duration = Duration.ofDays(7)
        const val DASHBOARD = "/#/dashboard?mercadopago="
    }
}
