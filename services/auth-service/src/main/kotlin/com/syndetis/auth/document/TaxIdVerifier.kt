package com.syndetis.auth.document

/** The Receita Federal's answer for a CPF or CNPJ, as the integration-hub reports it. */
data class TaxIdRecord(
    val type: String = "",
    val document: String = "",
    /** ACTIVE, INACTIVE, NOT_FOUND, BIRTH_DATE_MISMATCH or UNDERAGE. */
    val status: String = "",
    val registrationStatus: String? = null,
    val name: String? = null,
    val tradeName: String? = null,
    val mei: Boolean? = null,
    val legalNature: String? = null,
)

/** Asks the Receita Federal (through the integration-hub) about a CPF or CNPJ. */
fun interface TaxIdVerifier {
    /** @param birthDate ISO date (YYYY-MM-DD), required for a CPF. */
    fun verify(digits: String, birthDate: String?): TaxIdRecord
}
