package com.syndetis.auth.config

import com.syndetis.auth.security.GitHubOAuth2UserService
import com.syndetis.auth.security.OAuthLoginFailureHandler
import com.syndetis.auth.security.OAuthLoginSuccessHandler
import org.springframework.beans.factory.ObjectProvider
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain

@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val registrations: ObjectProvider<ClientRegistrationRepository>,
    private val githubUsers: GitHubOAuth2UserService,
    private val oauthSuccess: OAuthLoginSuccessHandler,
    private val oauthFailure: OAuthLoginFailureHandler,
) {

    @Bean
    fun passwordEncoder(): PasswordEncoder {
        return BCryptPasswordEncoder()
    }

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED) }
            .authorizeHttpRequests { auth ->
                auth.requestMatchers("/api/auth/**", "/error", "/.well-known/jwks.json",
                    "/oauth2/authorization/**", "/login/oauth2/code/**").permitAll()
                    .anyRequest().authenticated()
            }
        if (registrations.ifAvailable != null) {
            http.oauth2Login { oauth ->
                oauth.userInfoEndpoint { it.userService(githubUsers) }
                oauth.successHandler(oauthSuccess)
                oauth.failureHandler(oauthFailure)
            }
        }
        return http.build()
    }
}
