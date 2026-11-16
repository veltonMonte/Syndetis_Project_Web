package com.syndetis.auth.exception

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.security.authentication.BadCredentialsException

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(BadCredentialsException::class)
    fun handleBadCredentials(e: BadCredentialsException): ResponseEntity<Map<String, Any>> =
        ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            mapOf(
                "status" to 401,
                "error" to "Unauthorized",
                "message" to "Credenciais inválidas",
                "detail" to "E-mail ou senha incorretos. Verifique suas credenciais e tente novamente."
            )
        )

    @ExceptionHandler(InvalidCredentialsException::class)
    fun handleInvalidCredentials(e: InvalidCredentialsException): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            mapOf(
                "status" to HttpStatus.UNAUTHORIZED.value(),
                "error" to "Unauthorized",
                "message" to (e.message ?: "Credenciais inválidas"),
                "detail" to "E-mail ou senha incorretos. Verifique suas credenciais e tente novamente."
            )
        )
    }

    @ExceptionHandler(InvalidRefreshTokenException::class)
    fun handleInvalidRefreshToken(e: InvalidRefreshTokenException): ResponseEntity<Map<String, Any>> =
        ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            mapOf(
                "status" to HttpStatus.UNAUTHORIZED.value(),
                "error" to "Unauthorized",
                "message" to (e.message?.takeIf { it.isNotBlank() } ?: "Refresh token inválido"),
                "detail" to "Sua sessão expirou ou foi revogada. Por favor, faça login novamente para continuar."
            )
        )

    @ExceptionHandler(DuplicateEmailException::class)
    fun handleDuplicateEmail(e: DuplicateEmailException): ResponseEntity<Map<String, Any>> =
        ResponseEntity.status(HttpStatus.CONFLICT).body(
            mapOf(
                "status" to HttpStatus.CONFLICT.value(),
                "error" to "Conflict",
                "message" to (e.message?.takeIf { it.isNotBlank() } ?: "E-mail já cadastrado"),
                "detail" to "Já existe uma conta vinculada a este endereço de e-mail. Faça login ou solicite recuperação de acesso."
            )
        )

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationException(e: MethodArgumentNotValidException): ResponseEntity<Map<String, Any>> {
        val errors = e.bindingResult.fieldErrors.associate { it.field to (it.defaultMessage ?: "Inválido") }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            mapOf(
                "status" to HttpStatus.BAD_REQUEST.value(),
                "error" to "Bad Request",
                "message" to "Erro de validação: um ou mais campos contêm valores inválidos",
                "errors" to errors
            )
        )
    }
}
