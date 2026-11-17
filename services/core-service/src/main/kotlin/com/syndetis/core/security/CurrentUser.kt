package com.syndetis.core.security

import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class CurrentUser {
    private fun authentication(): JwtAuthenticationToken =
        SecurityContextHolder.getContext().authentication as? JwtAuthenticationToken
            ?: throw IllegalStateException("Usuário autenticado necessário")

    fun id(): UUID = UUID.fromString(authentication().token.subject)

    fun email(): String = authentication().token.getClaimAsString("email")
        ?: throw IllegalStateException("E-mail ausente no token")

    /**
     * Whether the Receita Federal confirmed the merchant's CNPJ, as the auth-service signed it into the token
     * (`doc_verified`). Null when the token says nothing (customers, older tokens): nothing is changed then.
     */
    fun documentVerified(): Boolean? = when (authentication().token.getClaim<Any>("doc_verified")) {
        true -> true
        false -> false
        else -> null
    }

    fun isAdmin(): Boolean = authentication().authorities.any { it.authority == "ROLE_ADMIN" }
}
