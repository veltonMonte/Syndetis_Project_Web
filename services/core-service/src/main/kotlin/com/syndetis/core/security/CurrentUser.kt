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

    fun isAdmin(): Boolean = authentication().authorities.any { it.authority == "ROLE_ADMIN" }
}
