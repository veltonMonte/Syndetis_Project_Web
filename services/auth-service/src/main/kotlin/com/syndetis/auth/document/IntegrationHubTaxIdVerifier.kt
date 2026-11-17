package com.syndetis.auth.document

import com.syndetis.auth.exception.DocumentCheckUnavailableException
import com.syndetis.auth.exception.DocumentRejectedException
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.stereotype.Component
import org.springframework.web.client.HttpClientErrorException
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException
import java.time.Duration

/** Calls POST /internal/tax-ids/verify on the integration-hub, which talks to BrasilAPI and SERPRO. */
@Component
class IntegrationHubTaxIdVerifier(
    @Value("\${auth.tax-id.hub-url:http://localhost:3001}") hubUrl: String,
    @Value("\${auth.tax-id.internal-token:}") private val internalToken: String,
) : TaxIdVerifier {
    private val client = RestClient.builder()
        .baseUrl(hubUrl.trimEnd('/'))
        .requestFactory(SimpleClientHttpRequestFactory().apply {
            setConnectTimeout(Duration.ofSeconds(3))
            setReadTimeout(Duration.ofSeconds(20))
        })
        .build()

    override fun verify(digits: String, birthDate: String?): TaxIdRecord {
        // Fail closed: without the shared secret no document can be confirmed, so no merchant is created.
        if (internalToken.length < 32) throw DocumentCheckUnavailableException()
        return try {
            client.post().uri("/internal/tax-ids/verify")
                .header("x-internal-token", internalToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(mapOf("document" to digits, "birthDate" to birthDate))
                .retrieve()
                .body(TaxIdRecord::class.java) ?: throw DocumentCheckUnavailableException()
        } catch (error: HttpClientErrorException.BadRequest) {
            throw DocumentRejectedException(hubMessage(error) ?: "Confira o CPF ou CNPJ informado.")
        } catch (error: RestClientException) {
            // 401/403 (wrong secret), 5xx and timeouts: the check did not happen.
            throw DocumentCheckUnavailableException()
        }
    }

    /** The hub's own Portuguese message for a malformed document (e.g. "CNPJ inválido"). */
    private fun hubMessage(error: HttpClientErrorException): String? =
        MESSAGE.find(error.responseBodyAsString)?.groupValues?.get(1)

    private companion object {
        val MESSAGE = Regex(""""message"\s*:\s*"([^"]{1,160})"""")
    }
}
