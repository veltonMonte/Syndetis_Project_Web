package com.syndetis.auth.controller

import com.syndetis.auth.document.MerchantDocumentService
import com.syndetis.auth.exception.DocumentRejectedException
import com.syndetis.auth.exception.DuplicateDocumentException
import com.syndetis.auth.exception.InvalidCredentialsException
import com.syndetis.auth.model.dto.DocumentRequestDto
import com.syndetis.auth.model.dto.LoginRequestDto
import com.syndetis.auth.model.dto.RegisterSellerRequestDto
import com.syndetis.auth.repository.UserRepository
import com.syndetis.auth.service.JwtService
import org.springframework.beans.factory.ObjectProvider
import org.springframework.http.HttpHeaders
import org.springframework.security.oauth2.client.registration.ClientRegistration
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestHeader
import java.util.UUID
import com.syndetis.auth.model.dto.LoginResponseDto
import com.syndetis.auth.model.dto.RegisterRequestDto
import com.syndetis.auth.model.dto.RegisterResponseDto
import com.syndetis.auth.model.dto.RefreshTokenRequest
import com.syndetis.auth.model.dto.OAuthCodeRequest
import com.syndetis.auth.model.enum.Role
import com.syndetis.auth.service.AuthService
import com.syndetis.auth.service.AuthTokenService
import com.syndetis.auth.service.OAuthLoginCodeStore
import jakarta.validation.Valid
import org.springframework.http.CacheControl
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService,
    private val tokens: AuthTokenService,
    private val oauthCodes: OAuthLoginCodeStore,
    private val documents: MerchantDocumentService,
    private val jwtService: JwtService,
    private val users: UserRepository,
    private val registrations: ObjectProvider<ClientRegistrationRepository>,
) {
    /**
     * The social logins this deployment offers: Google and GitHub are switched on by the oauth-google and
     * oauth-github profiles, with their credentials. The sign-in screen shows only these buttons.
     */
    @GetMapping("/providers")
    fun providers(): ResponseEntity<Map<String, List<String>>> {
        val repository = registrations.ifAvailable as? Iterable<*>
        val enabled = listOf("google", "github").filter { id ->
            repository?.any { (it as? ClientRegistration)?.registrationId == id } == true
        }
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(java.time.Duration.ofMinutes(5))).body(mapOf("oauth" to enabled))
    }

    @PostMapping("/login")
    fun login(@Valid @RequestBody loginRequestDto: LoginRequestDto): ResponseEntity<LoginResponseDto> {
        val response = authService.login(loginRequestDto)
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(response)
    }

    /** Buyer access created inside a storefront checkout. */
    @PostMapping("/register")
    fun register(@Valid @RequestBody registerRequestDto: RegisterRequestDto): ResponseEntity<RegisterResponseDto> {
        val response = authService.register(registerRequestDto, Role.CUSTOMER)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    /**
     * Merchant account created on the Syndetis site, the only accounts the platform itself offers. It is
     * created if, and only if, the Receita Federal confirms the store's CNPJ (exists and is active).
     */
    @PostMapping("/register/seller")
    fun registerSeller(@Valid @RequestBody request: RegisterSellerRequestDto): ResponseEntity<RegisterResponseDto> {
        authService.ensureEmailAvailable(request.email)
        val document = documents.confirm(request.document())
        val response = authService.register(request.account(), Role.SELLER, document)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    /**
     * A merchant who signed up with Google or GitHub confirms the store's CNPJ. Returns fresh tokens whose
     * `doc_verified` claim lets the core-service open stores for them.
     */
    @PostMapping("/me/document")
    fun confirmDocument(
        @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) authorization: String?,
        @Valid @RequestBody request: DocumentRequestDto,
    ): ResponseEntity<LoginResponseDto> {
        val subject = authorization?.takeIf { it.startsWith("Bearer ") }?.let { jwtService.validateToken(it.substring(7))?.subject }
            ?: throw InvalidCredentialsException()
        val user = users.findById(UUID.fromString(subject)).orElseThrow { InvalidCredentialsException() }
        if (user.role != Role.SELLER) throw DocumentRejectedException("Somente contas de lojista confirmam o CNPJ da loja.")
        if (user.documentVerified) throw DuplicateDocumentException()
        documents.apply(user, documents.confirm(request))
        users.saveAndFlush(user)
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(tokens.issue(user))
    }

    @PostMapping("/refresh")
    fun refresh(@Valid @RequestBody request: RefreshTokenRequest): ResponseEntity<LoginResponseDto> =
        ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(tokens.refresh(request.refreshToken))

    @PostMapping("/oauth2/exchange")
    fun exchange(@Valid @RequestBody request: OAuthCodeRequest): ResponseEntity<LoginResponseDto> =
        ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(oauthCodes.exchange(request.code))

    @PostMapping("/logout")
    fun logout(@Valid @RequestBody request: RefreshTokenRequest): ResponseEntity<Void> {
        tokens.logout(request.refreshToken)
        return ResponseEntity.noContent().build()
    }
}
