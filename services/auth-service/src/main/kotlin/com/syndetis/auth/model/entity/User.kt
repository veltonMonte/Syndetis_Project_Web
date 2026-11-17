package com.syndetis.auth.model.entity

import com.syndetis.auth.model.enum.DocumentType
import com.syndetis.auth.model.enum.Role
import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "users")
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,

    @Column(nullable = false)
    var firstName: String,

    @Column(nullable = false)
    var email: String,

    @Column
    var password: String?,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var role: Role = Role.CUSTOMER,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    /** The store's CNPJ confirmed with the Receita Federal; required before a merchant can open a store. CPF rows are legacy (V5). */
    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", length = 4)
    var documentType: DocumentType? = null,

    /** HMAC-SHA256 of the digits, so one document cannot open several merchant accounts. */
    @Column(name = "document_hash", length = 64)
    var documentHash: String? = null,

    /** The CNPJ as shown (legacy CPF rows: masked). */
    @Column(name = "document_display", length = 20)
    var documentDisplay: String? = null,

    /** CNPJ only: the razão social. */
    @Column(name = "legal_name", length = 200)
    var legalName: String? = null,

    @Column(name = "mei")
    var mei: Boolean? = null,

    @Column(name = "document_verified_at")
    var documentVerifiedAt: Instant? = null,
) {
    /** Only a confirmed CNPJ counts: accounts confirmed with a CPF before the CNPJ-only rule must confirm a CNPJ. */
    val documentVerified: Boolean get() = documentVerifiedAt != null && documentType == DocumentType.CNPJ
}
