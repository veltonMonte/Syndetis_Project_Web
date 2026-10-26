package com.syndetis.auth.config

import com.syndetis.auth.model.entity.User
import com.syndetis.auth.model.enum.Role
import com.syndetis.auth.repository.UserRepository
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile
import org.springframework.security.crypto.password.PasswordEncoder

@Configuration
@Profile("homologation")
class HomologationSellerConfig {
    @Bean
    fun seedSeller(
        users: UserRepository,
        encoder: PasswordEncoder,
        @Value("\${homologation.seller.email}") email: String,
        @Value("\${homologation.seller.password}") password: String,
    ) = ApplicationRunner {
        require(email.contains('@') && password.length >= 12) { "Configure e-mail e senha de homologação (mínimo 12 caracteres)" }
        val normalized = email.trim().lowercase()
        val existing = users.findByEmailIgnoreCase(normalized)
        if (existing == null) {
            users.save(User(firstName = "Lojista de homologação", email = normalized,
                password = encoder.encode(password), role = Role.SELLER))
        } else {
            require(existing.role == Role.SELLER) { "O e-mail de homologação já pertence a outro tipo de usuário" }
        }
    }
}
