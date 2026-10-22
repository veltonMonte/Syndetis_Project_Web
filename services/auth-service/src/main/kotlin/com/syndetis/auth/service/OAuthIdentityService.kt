package com.syndetis.auth.service

import com.syndetis.auth.model.entity.OAuthAccount
import com.syndetis.auth.model.entity.User
import com.syndetis.auth.model.enum.Role
import com.syndetis.auth.repository.OAuthAccountRepository
import com.syndetis.auth.repository.UserRepository
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.oauth2.core.oidc.user.OidcUser
import org.springframework.security.oauth2.core.user.OAuth2User
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.Locale
import java.util.UUID

@Service
class OAuthIdentityService(
    private val accounts: OAuthAccountRepository,
    private val users: UserRepository,
) {
    @Transactional
    fun resolve(provider: String, principal: OAuth2User): UUID {
        if (provider !in setOf("google", "github")) throw BadCredentialsException("Provedor não permitido")
        val subject = when (provider) {
            "google" -> (principal as? OidcUser)?.subject
            else -> principal.attributes["id"]?.toString()
        }?.takeIf { it.isNotBlank() } ?: throw BadCredentialsException("Identidade inválida")

        accounts.findByProviderAndProviderSubject(provider, subject)?.let { return it.userId }

        val email = when (provider) {
            "google" -> (principal as OidcUser).takeIf { it.emailVerified == true }?.email
            else -> principal.attributes["verified_email"] as? String
        }?.trim()?.lowercase(Locale.ROOT)?.takeIf { it.isNotBlank() }
            ?: throw BadCredentialsException("E-mail verificado obrigatório")

        // Existing local accounts need an explicit, authenticated linking flow.
        if (users.findByEmailIgnoreCase(email) != null) {
            throw BadCredentialsException("Conta já existente para este e-mail")
        }
        val name = (principal.attributes["name"] as? String)
            ?.trim()?.takeIf { it.isNotBlank() } ?: email.substringBefore('@')
        val user = users.saveAndFlush(User(firstName = name.take(255), email = email, password = null, role = Role.CUSTOMER))
        accounts.saveAndFlush(OAuthAccount(userId = requireNotNull(user.id), provider = provider, providerSubject = subject))
        return requireNotNull(user.id)
    }
}
