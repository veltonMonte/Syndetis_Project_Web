package com.syndetis.auth.security

import com.syndetis.auth.service.OAuthIdentityService
import com.syndetis.auth.service.OAuthLoginCodeStore
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.security.core.Authentication
import org.springframework.security.core.AuthenticationException
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken
import org.springframework.security.web.authentication.AuthenticationSuccessHandler
import org.springframework.stereotype.Component
import org.springframework.web.util.UriComponentsBuilder

@Component
class OAuthLoginSuccessHandler(
    private val identities: OAuthIdentityService,
    private val codes: OAuthLoginCodeStore,
    private val failures: OAuthLoginFailureHandler,
    @Value("\${auth.oauth2.frontend-callback}") private val callback: String,
) : AuthenticationSuccessHandler {
    override fun onAuthenticationSuccess(request: HttpServletRequest, response: HttpServletResponse, authentication: Authentication) {
        try {
            val oauth = authentication as OAuth2AuthenticationToken
            val userId = identities.resolve(oauth.authorizedClientRegistrationId, oauth.principal)
            val code = codes.issue(userId)
            request.getSession(false)?.invalidate()
            response.setHeader("Cache-Control", "no-store")
            response.sendRedirect(UriComponentsBuilder.fromUriString(callback).queryParam("code", code).build().toUriString())
        } catch (exception: AuthenticationException) {
            failures.onAuthenticationFailure(request, response, exception)
        }
    }
}
