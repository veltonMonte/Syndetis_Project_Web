package com.syndetis.auth.exception

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(InvalidCredentialsException::class)
    fun handleInvalidCredentials(e: InvalidCredentialsException): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            mapOf(
                "status" to HttpStatus.UNAUTHORIZED.value(),
                "error" to "Unauthorized",
                "message" to (e.message ?: "Credenciais inválidas")
            )
        )
    }

    @ExceptionHandler(InvalidRefreshTokenException::class)
    fun handleInvalidRefreshToken(e: InvalidRefreshTokenException): ResponseEntity<Map<String, Any>> =
        ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            mapOf(
                "status" to HttpStatus.UNAUTHORIZED.value(),
                "error" to "Unauthorized",
                "message" to e.message.orEmpty(),
            )
        )

    @ExceptionHandler(DuplicateEmailException::class)
    fun handleDuplicateEmail(e: DuplicateEmailException): ResponseEntity<Map<String, Any>> =
        ResponseEntity.status(HttpStatus.CONFLICT).body(
            mapOf(
                "status" to HttpStatus.CONFLICT.value(),
                "error" to "Conflict",
                "message" to e.message.orEmpty(),
            )
        )

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationException(e: MethodArgumentNotValidException): ResponseEntity<Map<String, Any>> {
        val errors = e.bindingResult.fieldErrors.associate { it.field to (it.defaultMessage ?: "Inválido") }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            mapOf(
                "status" to HttpStatus.BAD_REQUEST.value(),
                "error" to "Bad Request",
                "errors" to errors
            )
        )
    }
}
