package com.syndetis.auth.security

import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService
import org.springframework.security.oauth2.core.user.DefaultOAuth2User
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient

@Component
class GitHubOAuth2UserService : OAuth2UserService<OAuth2UserRequest, OAuth2User> {
    private val delegate = DefaultOAuth2UserService()
    private val client = RestClient.create()

    override fun loadUser(request: OAuth2UserRequest): OAuth2User {
        val user = delegate.loadUser(request)
        if (request.clientRegistration.registrationId != "github") return user

        val emails = client.get().uri("https://api.github.com/user/emails")
            .headers { it.setBearerAuth(request.accessToken.tokenValue) }
            .retrieve().body(Array<GitHubEmail>::class.java).orEmpty()
        val verified = emails.firstOrNull { it.primary && it.verified }
            ?: throw BadCredentialsException("E-mail verificado obrigatório")
        val attributes = user.attributes + ("verified_email" to verified.email)
        return DefaultOAuth2User(user.authorities, attributes, "id")
    }

    private data class GitHubEmail(val email: String, val primary: Boolean, val verified: Boolean)
}
