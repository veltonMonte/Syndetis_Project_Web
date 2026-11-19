package com.syndetis.auth.document

/** The Receita Federal's answer for a CNPJ, as the integration-hub reports it. */
data class TaxIdRecord(
    val type: String = "",
    val document: String = "",
    /** ACTIVE, INACTIVE or NOT_FOUND. */
    val status: String = "",
    val registrationStatus: String? = null,
    val name: String? = null,
    val tradeName: String? = null,
    val mei: Boolean? = null,
    val legalNature: String? = null,
)

/** Asks the Receita Federal (through the integration-hub) about a store's CNPJ. */
fun interface TaxIdVerifier {
    fun verify(digits: String): TaxIdRecord
}
