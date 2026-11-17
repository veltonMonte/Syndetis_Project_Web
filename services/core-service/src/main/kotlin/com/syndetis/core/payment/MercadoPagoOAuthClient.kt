package com.syndetis.core.payment

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.syndetis.core.exception.ServiceUnavailableException
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import java.net.http.HttpClient
import java.time.Duration

/** A merchant's Mercado Pago account as the integration-hub returns it after OAuth. */
@JsonIgnoreProperties(ignoreUnknown = true)
data class MercadoPagoAccount(
    val accessToken: String,
    val refreshToken: String,
    val publicKey: String? = null,
    val userId: String,
    val nickname: String? = null,
    val liveMode: Boolean,
    val expiresIn: Long,
) {
    override fun toString() = "MercadoPagoAccount(userId=$userId, liveMode=$liveMode)"
}

/** Mercado Pago's OAuth for platforms, run by the integration-hub (which holds the application secret). */
interface MercadoPagoOAuthClient {
    fun configured(): Boolean
    fun authorizationUrl(state: String, codeChallenge: String): String
    fun exchange(code: String, codeVerifier: String): MercadoPagoAccount
    fun refresh(refreshToken: String): MercadoPagoAccount
}

@Component
class IntegrationHubMercadoPagoOAuth(
    @Value("\${core.payments.hub-url:http://localhost:3001}") hubUrl: String,
    @Value("\${core.payments.internal-token:}") private val internalToken: String,
) : MercadoPagoOAuthClient {
    private val client = RestClient.builder()
        .baseUrl(hubUrl)
        .requestFactory(JdkClientHttpRequestFactory(HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3)).build()).apply { setReadTimeout(Duration.ofSeconds(20)) })
        .build()

    private data class Configured(val configured: Boolean = false)
    private data class Url(val url: String = "")

    override fun configured(): Boolean {
        if (internalToken.length < 32) return false
        return client.get().uri("/internal/payments/oauth").header("X-Internal-Token", internalToken)
            .retrieve().body(Configured::class.java)?.configured == true
    }

    override fun authorizationUrl(state: String, codeChallenge: String): String = call {
        client.post().uri("/internal/payments/oauth/authorization-url").header("X-Internal-Token", internalToken)
            .body(mapOf("state" to state, "codeChallenge" to codeChallenge)).retrieve().body(Url::class.java)?.url
            ?.takeIf { it.startsWith("https://auth.mercadopago.com/") }
    }

    override fun exchange(code: String, codeVerifier: String): MercadoPagoAccount = call {
        client.post().uri("/internal/payments/oauth/token").header("X-Internal-Token", internalToken)
            .body(mapOf("code" to code, "codeVerifier" to codeVerifier)).retrieve().body(MercadoPagoAccount::class.java)
    }

    override fun refresh(refreshToken: String): MercadoPagoAccount = call {
        client.post().uri("/internal/payments/oauth/refresh").header("X-Internal-Token", internalToken)
            .body(mapOf("refreshToken" to refreshToken)).retrieve().body(MercadoPagoAccount::class.java)
    }

    private fun <T : Any> call(block: () -> T?): T {
        if (internalToken.length < 32) throw ServiceUnavailableException("Pagamento ainda não configurado")
        return try {
            block() ?: throw IllegalStateException("Resposta vazia do Mercado Pago")
        } catch (exception: Exception) {
            throw ServiceUnavailableException("Não foi possível falar com o Mercado Pago agora. Tente novamente.")
        }
    }
}
