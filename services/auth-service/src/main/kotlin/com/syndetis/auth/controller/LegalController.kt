package com.syndetis.auth.controller

import com.syndetis.auth.exception.InvalidCredentialsException
import com.syndetis.auth.model.dto.LegalAcceptanceRequestDto
import com.syndetis.auth.model.dto.LegalStatusDto
import com.syndetis.auth.model.dto.LegalVersionsDto
import com.syndetis.auth.model.enum.LegalAcceptanceOrigin
import com.syndetis.auth.repository.UserRepository
import com.syndetis.auth.service.JwtService
import com.syndetis.auth.service.LegalAcceptanceService
import jakarta.validation.Valid
import org.springframework.http.CacheControl
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Duration
import java.util.UUID

/** The Terms of Use and Privacy Policy versions in force, and each account's acceptance of them. */
@RestController
@RequestMapping("/api/auth")
class LegalController(
    private val legal: LegalAcceptanceService,
    private val jwtService: JwtService,
    private val users: UserRepository,
) {
    @GetMapping("/legal")
    fun current(): ResponseEntity<LegalVersionsDto> =
        ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofMinutes(5))).body(legal.current())

    @GetMapping("/me/legal")
    fun status(
        @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) authorization: String?,
    ): ResponseEntity<LegalStatusDto> =
        ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(legal.status(accountId(authorization)))

    /** A merchant who signed up with Google or GitHub, or who is shown a newer version, accepts it here. */
    @PostMapping("/me/legal")
    fun accept(
        @RequestHeader(HttpHeaders.AUTHORIZATION, required = false) authorization: String?,
        @Valid @RequestBody request: LegalAcceptanceRequestDto,
    ): ResponseEntity<LegalStatusDto> =
        ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(legal.record(accountId(authorization), request, LegalAcceptanceOrigin.IN_APP))

    private fun accountId(authorization: String?): UUID {
        val subject = authorization?.takeIf { it.startsWith("Bearer ") }
            ?.let { jwtService.validateToken(it.substring(7))?.subject }
            ?: throw InvalidCredentialsException()
        val id = runCatching { UUID.fromString(subject) }.getOrNull() ?: throw InvalidCredentialsException()
        if (!users.existsById(id)) throw InvalidCredentialsException()
        return id
    }
}
