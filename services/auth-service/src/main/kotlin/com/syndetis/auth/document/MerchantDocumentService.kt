package com.syndetis.auth.document

import com.syndetis.auth.exception.DocumentRejectedException
import com.syndetis.auth.exception.DuplicateDocumentException
import com.syndetis.auth.model.dto.DocumentRequestDto
import com.syndetis.auth.model.entity.User
import com.syndetis.auth.model.enum.DocumentType
import com.syndetis.auth.repository.UserRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.time.Instant
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/** A store's CNPJ the Receita Federal confirmed, ready to be stored on the account. */
data class ConfirmedDocument(
    val type: DocumentType,
    val hash: String,
    val display: String,
    val legalName: String?,
    val mei: Boolean?,
)

/**
 * The rule for merchant accounts: only a company can sell. A CNPJ is accepted if, and only if, the Receita Federal
 * knows it and its situação cadastral is ATIVA (a MEI is a CNPJ too), and no other account already uses it.
 * A CPF is refused before any query, as a fraud barrier (docs/architecture/adr/0006-lojista-somente-cnpj.md).
 */
@Service
class MerchantDocumentService(
    private val verifier: TaxIdVerifier,
    private val users: UserRepository,
    @Value("\${auth.tax-id.hash-key:syndetis-local-document-key}") hashKey: String,
) {
    private val key = SecretKeySpec(hashKey.toByteArray(), "HmacSHA256")

    fun confirm(request: DocumentRequestDto): ConfirmedDocument {
        val digits = request.document.filter(Char::isDigit)
        if (digits.length == 11) throw DocumentRejectedException("Contas de lojista usam o CNPJ da loja, não CPF.")
        if (digits.length != 14) throw DocumentRejectedException("Informe o CNPJ da loja (14 dígitos).")
        val hash = hash(digits)
        if (users.existsByDocumentHash(hash)) throw DuplicateDocumentException()

        val record = verifier.verify(digits)
        if (record.document != digits) throw DocumentRejectedException("A Receita Federal retornou outro documento. Tente novamente.")
        when (record.status) {
            "ACTIVE" -> Unit
            "NOT_FOUND" -> throw DocumentRejectedException("Este CNPJ não existe na Receita Federal.")
            "INACTIVE" -> throw DocumentRejectedException(
                "Este CNPJ está com a situação ${record.registrationStatus?.lowercase() ?: "irregular"} na Receita Federal. " +
                    "Só CNPJs ativos podem abrir uma loja.")
            else -> throw DocumentRejectedException("Não foi possível confirmar o CNPJ. Tente novamente.")
        }
        return ConfirmedDocument(
            type = DocumentType.CNPJ,
            hash = hash,
            display = formatCnpj(digits),
            legalName = record.name?.take(200),
            mei = record.mei == true,
        )
    }

    fun apply(user: User, document: ConfirmedDocument) {
        user.documentType = document.type
        user.documentHash = document.hash
        user.documentDisplay = document.display
        user.legalName = document.legalName
        user.mei = document.mei
        user.documentVerifiedAt = Instant.now()
    }

    private fun hash(digits: String): String =
        Mac.getInstance("HmacSHA256").apply { init(key) }.doFinal(digits.toByteArray()).joinToString("") { "%02x".format(it) }

    companion object {
        fun formatCnpj(digits: String) =
            "${digits.substring(0, 2)}.${digits.substring(2, 5)}.${digits.substring(5, 8)}/${digits.substring(8, 12)}-${digits.substring(12)}"
    }
}
