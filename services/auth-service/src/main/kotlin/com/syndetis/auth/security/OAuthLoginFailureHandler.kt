package com.syndetis.auth.security

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.authentication.AuthenticationFailureHandler
import org.springframework.stereotype.Component
import org.springframework.web.util.UriComponentsBuilder

@Component
class OAuthLoginFailureHandler(
    @Value("\${auth.oauth2.frontend-callback}") private val callback: String,
) : AuthenticationFailureHandler {
    override fun onAuthenticationFailure(request: HttpServletRequest, response: HttpServletResponse, exception: AuthenticationException) {
        request.getSession(false)?.invalidate()
        response.setHeader("Cache-Control", "no-store")
        response.sendRedirect(UriComponentsBuilder.fromUriString(callback).queryParam("error", "oauth_login_failed").build().toUriString())
    }
}
