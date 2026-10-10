package com.syndetis.core.security

import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.jwt.Jwt
import java.util.UUID

object SecurityUtils {

    fun currentUserId(): UUID {
        val authentication = SecurityContextHolder.getContext().authentication
        val jwt = authentication?.principal as? Jwt
            ?: throw IllegalStateException("Nenhum usuário autenticado encontrado no contexto de segurança")

        return UUID.fromString(jwt.subject)
    }
}
