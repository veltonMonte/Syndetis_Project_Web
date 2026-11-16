package com.syndetis.core.payment

import com.syndetis.core.exception.ServiceUnavailableException
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.core.ParameterizedTypeReference
import java.util.UUID
import java.net.http.HttpClient
import java.time.Duration

@Component
class IntegrationHubPaymentGateway(
    @Value("\${core.payments.hub-url:http://localhost:3001}") hubUrl: String,
    @Value("\${core.payments.internal-token:}") private val internalToken: String,
) : PaymentGateway {
    private val client = RestClient.builder()
        .baseUrl(hubUrl)
        .requestFactory(JdkClientHttpRequestFactory(HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3)).build()).apply { setReadTimeout(Duration.ofSeconds(12)) })
        .build()

    override fun createCheckout(request: PaymentCheckoutRequest): PaymentCheckoutResponse {
        if (internalToken.length < 32) throw ServiceUnavailableException("Pagamento ainda não configurado")
        return try {
            client.post().uri("/internal/payments/checkouts")
                .header("X-Internal-Token", internalToken).body(request)
                .retrieve().body(PaymentCheckoutResponse::class.java)
                ?: throw IllegalStateException("Resposta de pagamento vazia")
        } catch (exception: Exception) {
            throw ServiceUnavailableException("Não foi possível iniciar o pagamento. Tente novamente pelo mesmo pedido.")
        }
    }

    override fun findPayments(orderId: UUID): List<PaymentNotification> {
        if (internalToken.length < 32) throw ServiceUnavailableException("Pagamento ainda não configurado")
        return try {
            client.get().uri("/internal/payments/orders/{id}", orderId)
                .header("X-Internal-Token", internalToken).retrieve()
                .body(object : ParameterizedTypeReference<List<PaymentNotification>>() {}) ?: emptyList()
        } catch (exception: Exception) {
            throw ServiceUnavailableException("Não foi possível consultar o pagamento. Tente novamente.")
        }
    }
}
