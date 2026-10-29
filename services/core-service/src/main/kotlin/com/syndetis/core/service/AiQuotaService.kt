package com.syndetis.core.service

import com.syndetis.core.exception.ConflictException
import com.syndetis.core.model.dto.billing.*
import com.syndetis.core.repository.SubscriptionRepository
import com.syndetis.core.security.StoreAccessGuard
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.sql.Timestamp
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.util.UUID

/** Reservation commits before future provider I/O. No public debit/refund endpoint. */
@Service
class AiQuotaService(
    private val jdbc: JdbcTemplate,
    private val subscriptions: SubscriptionRepository,
    private val rules: StorePlanRules,
    private val access: StoreAccessGuard,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun usage(storeId: UUID, limit: Int): AiAllowance {
        val now = clock.instant()
        val date = now.atZone(ZONE).toLocalDate()
        // Unknown provider outcomes keep their slot, including expired reservations.
        // Releasing them automatically could allow more than 30 billable calls.
        val used = jdbc.queryForObject("""SELECT count(*) FROM ai_request_usage WHERE store_id=? AND quota_date=?
            AND state IN ('COMPLETED','RESERVED')""", Int::class.java, storeId, date) ?: 0
        return AiAllowance(limit, used, (limit - used).coerceAtLeast(0), date, date.plusDays(1).atStartOfDay(ZONE).toInstant())
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun reserve(storeId: UUID, requestId: UUID, operation: AiOperation): AiReservation {
        access.forManage(storeId)
        subscriptions.lockStore(storeId)
        val limit = rules.requireAi(storeId)
        val now = clock.instant()
        existing(storeId, requestId)?.let {
            if (it.operation != operation) throw ConflictException("Identificador de IA já usado para outra operação")
            if (it.state == AiRequestState.FAILED || (it.state == AiRequestState.RESERVED && !it.expiresAt.isAfter(now))) {
                throw ConflictException("Requisição de IA encerrada ou expirada; use um novo identificador")
            }
            return it
        }
        val usage = usage(storeId, limit)
        if (usage.remaining == 0) throw ConflictException("Limite diário de $limit requisições de IA atingido")
        val expires = now.plus(RESERVATION_TTL)
        jdbc.update("""INSERT INTO ai_request_usage(store_id,request_id,operation,quota_date,state,created_at,expires_at)
            VALUES (?,?,?,?,'RESERVED',?,?)""", storeId, requestId, operation.name, usage.date, Timestamp.from(now), Timestamp.from(expires))
        return AiReservation(requestId, operation, AiRequestState.RESERVED, usage.date, expires, acquired = true)
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun complete(storeId: UUID, requestId: UUID) = finish(storeId, requestId, AiRequestState.COMPLETED)

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun fail(storeId: UUID, requestId: UUID) = finish(storeId, requestId, AiRequestState.FAILED)

    private fun finish(storeId: UUID, requestId: UUID, state: AiRequestState) {
        subscriptions.lockStore(storeId)
        val reservation = existing(storeId, requestId) ?: throw ConflictException("Reserva de IA não encontrada")
        if (reservation.state == state) return
        val now = clock.instant()
        if (reservation.state != AiRequestState.RESERVED || (state == AiRequestState.COMPLETED && !reservation.expiresAt.isAfter(now))) {
            throw ConflictException("Reserva de IA já encerrada ou expirada")
        }
        jdbc.update("UPDATE ai_request_usage SET state=?,finished_at=? WHERE store_id=? AND request_id=?",
            state.name, Timestamp.from(now), storeId, requestId)
    }

    private fun existing(storeId: UUID, requestId: UUID): AiReservation? = jdbc.query(
        "SELECT * FROM ai_request_usage WHERE store_id=? AND request_id=?",
        { rs, _ -> AiReservation(rs.getObject("request_id", UUID::class.java), AiOperation.valueOf(rs.getString("operation")),
            AiRequestState.valueOf(rs.getString("state")), rs.getDate("quota_date").toLocalDate(), rs.getTimestamp("expires_at").toInstant()) },
        storeId, requestId).firstOrNull()

    companion object {
        val ZONE: ZoneId = ZoneId.of("America/Sao_Paulo")
        val RESERVATION_TTL: Duration = Duration.ofMinutes(15)
    }
}
