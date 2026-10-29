package com.syndetis.core.repository

import com.syndetis.core.exception.NotFoundException
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.RowMapper
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.Timestamp
import java.time.Instant
import java.util.UUID

data class SubscriptionRecord(val id: UUID, val storeId: UUID, val planId: String, val price: BigDecimal,
    val providerId: String?, val customerId: String?, val providerStatus: String, val paidUntil: Instant?,
    val cancelledAt: Instant?, val claimedAt: Instant?, val observedAt: Instant?, val payments: String)

@Repository
class SubscriptionRepository(private val jdbc: JdbcTemplate) {
    private val row = RowMapper { rs, _ -> SubscriptionRecord(rs.getObject("id", UUID::class.java),
        rs.getObject("store_id", UUID::class.java), rs.getString("plan_id"), rs.getBigDecimal("price"),
        rs.getString("provider_id"), rs.getString("customer_id"), rs.getString("provider_status"),
        rs.getTimestamp("paid_until")?.toInstant(), rs.getTimestamp("cancelled_at")?.toInstant(),
        rs.getTimestamp("claimed_at")?.toInstant(), rs.getTimestamp("observed_at")?.toInstant(), rs.getString("payments")) }

    fun lockStore(id: UUID) { jdbc.queryForObject("SELECT id FROM stores WHERE id = ? FOR UPDATE", UUID::class.java, id)
        ?: throw NotFoundException("Loja não encontrada") }
    fun latest(storeId: UUID): SubscriptionRecord? = jdbc.query(
        "SELECT * FROM store_subscriptions WHERE store_id = ? ORDER BY created_at DESC, id DESC LIMIT 1", row, storeId).firstOrNull()
    fun lock(id: UUID): SubscriptionRecord = jdbc.query("SELECT * FROM store_subscriptions WHERE id = ? FOR UPDATE", row, id)
        .firstOrNull() ?: throw NotFoundException("Assinatura não encontrada")
    fun lockFree(id: UUID): SubscriptionRecord = jdbc.query("SELECT * FROM store_subscriptions WHERE id = ?", row, id)
        .firstOrNull() ?: throw NotFoundException("Assinatura não encontrada")
    fun insert(id: UUID, storeId: UUID, planId: String, price: BigDecimal) {
        jdbc.update("INSERT INTO store_subscriptions(id,store_id,plan_id,price) VALUES (?,?,?,?)", id, storeId, planId, price)
    }
    fun claim(id: UUID, now: Instant) { jdbc.update("UPDATE store_subscriptions SET claimed_at = ? WHERE id = ?", Timestamp.from(now), id) }
    fun update(id: UUID, providerId: String, customerId: String, status: String, paidUntil: Instant?, observedAt: Instant, payments: String) {
        jdbc.update("""UPDATE store_subscriptions SET provider_id=?, customer_id=?, provider_status=?, paid_until=?,
            observed_at=?, payments=CAST(? AS jsonb), claimed_at=NULL,
            cancelled_at=CASE WHEN ? = 'DELETED' THEN COALESCE(cancelled_at,now()) ELSE cancelled_at END WHERE id=?""",
            providerId, customerId, status, paidUntil?.let(Timestamp::from), Timestamp.from(observedAt), payments, status, id)
    }
    fun cancel(id: UUID) { jdbc.update("UPDATE store_subscriptions SET cancelled_at=COALESCE(cancelled_at,now()), provider_status='DELETED' WHERE id=?", id) }
    fun entitled(storeId: UUID): Boolean = jdbc.queryForObject(
        "SELECT EXISTS(SELECT 1 FROM store_subscriptions WHERE store_id=? AND paid_until > now())", Boolean::class.java, storeId) == true
    // Renewal cancellation keeps the already paid entitlement until paid_until.
    fun active(storeId: UUID): SubscriptionRecord? = jdbc.query(
        "SELECT * FROM store_subscriptions WHERE store_id=? AND paid_until > now() ORDER BY created_at DESC, id DESC LIMIT 1",
        row, storeId).firstOrNull()
    fun latestToReconcile(): List<UUID> = jdbc.queryForList("""SELECT id FROM store_subscriptions
        WHERE provider_id IS NOT NULL AND (cancelled_at IS NULL OR paid_until > now())
        ORDER BY observed_at NULLS FIRST LIMIT 20""", UUID::class.java).filterNotNull()
}
