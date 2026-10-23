package com.syndetis.auth.controller

import com.syndetis.auth.model.dto.LoginRequestDto
import com.syndetis.auth.model.dto.LoginResponseDto
import com.syndetis.auth.model.dto.RegisterRequestDto
import com.syndetis.auth.model.dto.RegisterResponseDto
import com.syndetis.auth.model.dto.RefreshTokenRequest
import com.syndetis.auth.model.dto.OAuthCodeRequest
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
) {
    @PostMapping("/login")
    fun login(@Valid @RequestBody loginRequestDto: LoginRequestDto): ResponseEntity<LoginResponseDto> {
        val response = authService.login(loginRequestDto)
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(response)
    }

    @PostMapping("/register")
    fun register(@Valid @RequestBody registerRequestDto: RegisterRequestDto): ResponseEntity<RegisterResponseDto> {
        val response = authService.register(registerRequestDto)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
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
