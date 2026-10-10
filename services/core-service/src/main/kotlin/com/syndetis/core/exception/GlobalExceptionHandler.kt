package com.syndetis.core.exception

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import java.time.Instant

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(SlugAlreadyExistsException::class)
    fun handleSlugAlreadyExists(e: SlugAlreadyExistsException): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
            mapOf(
                "status" to HttpStatus.CONFLICT.value(),
                "error" to "Conflict",
                "message" to (e.message ?: "Conflito de dados"),
                "timestamp" to Instant.now().toString()
            )
        )
    }

    @ExceptionHandler(StoreNotFoundException::class)
    fun handleStoreNotFound(e: StoreNotFoundException): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            mapOf(
                "status" to HttpStatus.NOT_FOUND.value(),
                "error" to "Not Found",
                "message" to (e.message ?: "Recurso não encontrado"),
                "timestamp" to Instant.now().toString()
            )
        )
    }

    @ExceptionHandler(LayoutConfigNotFoundException::class)
    fun handleLayoutConfigNotFound(e: LayoutConfigNotFoundException): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            mapOf(
                "status" to HttpStatus.NOT_FOUND.value(),
                "error" to "Not Found",
                "message" to (e.message ?: "Layout não encontrado"),
                "timestamp" to Instant.now().toString()
            )
        )
    }

    @ExceptionHandler(StoreAccessDeniedException::class)
    fun handleStoreAccessDenied(e: StoreAccessDeniedException): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
            mapOf(
                "status" to HttpStatus.FORBIDDEN.value(),
                "error" to "Forbidden",
                "message" to (e.message ?: "Acesso negado"),
                "timestamp" to Instant.now().toString()
            )
        )
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationException(e: MethodArgumentNotValidException): ResponseEntity<Map<String, Any>> {
        val errors = e.bindingResult.fieldErrors.associate { it.field to (it.defaultMessage ?: "Inválido") }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            mapOf(
                "status" to HttpStatus.BAD_REQUEST.value(),
                "error" to "Bad Request",
                "message" to "Erro de validação nos campos",
                "errors" to errors,
                "timestamp" to Instant.now().toString()
            )
        )
    }
}
