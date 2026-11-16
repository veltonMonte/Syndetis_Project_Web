package com.syndetis.core.service

import com.syndetis.core.exception.ServiceUnavailableException
import com.syndetis.core.model.dto.billing.BillingCreateRequest
import com.syndetis.core.model.dto.billing.BillingSnapshot
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import java.net.http.HttpClient
import java.time.Duration

interface SubscriptionGateway {
    fun create(request: BillingCreateRequest): BillingSnapshot
    fun synchronize(providerId: String): BillingSnapshot
    fun cancel(providerId: String)
}

@Component
class HubSubscriptionGateway(@Value("\${core.payments.hub-url:http://localhost:3001}") hubUrl: String,
    @Value("\${core.billing.internal-token:}") private val token: String) : SubscriptionGateway {
    private val client = RestClient.builder().baseUrl(hubUrl).requestFactory(JdkClientHttpRequestFactory(
        HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build()).apply { setReadTimeout(Duration.ofSeconds(60)) }).build()
    private fun <T> call(block: () -> T): T {
        if (token.length < 32) throw ServiceUnavailableException("Credencial interna de assinatura não configurada")
        return try { block() } catch (_: Exception) { throw ServiceUnavailableException("Não foi possível comunicar com o Asaas. Aguarde e atualize a assinatura") }
    }
    override fun create(request: BillingCreateRequest): BillingSnapshot = call {
        requireNotNull(client.post().uri("/internal/billing/subscriptions").header("X-Internal-Token", token)
            .body(request).retrieve().body(BillingSnapshot::class.java))
    }
    override fun synchronize(providerId: String): BillingSnapshot = call {
        requireNotNull(client.post().uri("/internal/billing/subscriptions/{id}/sync", providerId).header("X-Internal-Token", token)
            .retrieve().body(BillingSnapshot::class.java))
    }
    override fun cancel(providerId: String) { call { client.post().uri("/internal/billing/subscriptions/{id}/cancel", providerId)
        .header("X-Internal-Token", token).retrieve().toBodilessEntity() } }
}
