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
import java.time.LocalDate
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/** A merchant document the Receita Federal confirmed, ready to be stored on the account. */
data class ConfirmedDocument(
    val type: DocumentType,
    val hash: String,
    val display: String,
    val legalName: String?,
    val mei: Boolean?,
)

/**
 * The rule for merchant accounts: a CPF or CNPJ is accepted if, and only if, the Receita Federal knows it
 * and it is regular (CPF "REGULAR", CNPJ "ATIVA"), and no other account already uses it.
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
        val type = when (digits.length) {
            11 -> DocumentType.CPF
            14 -> DocumentType.CNPJ
            else -> throw DocumentRejectedException("Informe um CPF (11 dígitos) ou um CNPJ (14 dígitos).")
        }
        val birth = request.birthDate
        if (type == DocumentType.CPF) {
            if (birth == null) throw DocumentRejectedException("Informe a data de nascimento do titular do CPF.")
            if (!birth.isBefore(LocalDate.now()) || birth.year < 1900) throw DocumentRejectedException("Data de nascimento inválida.")
        }
        val hash = hash(digits)
        if (users.existsByDocumentHash(hash)) throw DuplicateDocumentException()

        val record = verifier.verify(digits, if (type == DocumentType.CPF) birth.toString() else null)
        if (record.document != digits) throw DocumentRejectedException("A Receita Federal retornou outro documento. Tente novamente.")
        val label = type.name
        when (record.status) {
            "ACTIVE" -> Unit
            "NOT_FOUND", "BIRTH_DATE_MISMATCH" -> throw DocumentRejectedException(
                if (type == DocumentType.CPF) "Não encontramos este CPF com essa data de nascimento na Receita Federal."
                else "Este CNPJ não existe na Receita Federal.")
            "UNDERAGE" -> throw DocumentRejectedException("O titular do CPF precisa ter 18 anos ou mais para vender.")
            "INACTIVE" -> throw DocumentRejectedException(
                "Este $label está com a situação ${record.registrationStatus?.lowercase() ?: "irregular"} na Receita Federal. " +
                    "Só documentos ativos podem abrir uma loja.")
            else -> throw DocumentRejectedException("Não foi possível confirmar o $label. Tente novamente.")
        }
        return ConfirmedDocument(
            type = type,
            hash = hash,
            display = if (type == DocumentType.CPF) maskCpf(digits) else formatCnpj(digits),
            legalName = if (type == DocumentType.CNPJ) record.name?.take(200) else null,
            mei = if (type == DocumentType.CNPJ) record.mei == true else null,
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
        fun maskCpf(digits: String) = "***.${digits.substring(3, 6)}.${digits.substring(6, 9)}-**"
        fun formatCnpj(digits: String) =
            "${digits.substring(0, 2)}.${digits.substring(2, 5)}.${digits.substring(5, 8)}/${digits.substring(8, 12)}-${digits.substring(12)}"
    }
}
