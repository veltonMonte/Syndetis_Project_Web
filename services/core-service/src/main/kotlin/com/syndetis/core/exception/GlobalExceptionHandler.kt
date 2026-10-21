package com.syndetis.core.exception

import jakarta.validation.ConstraintViolationException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.orm.ObjectOptimisticLockingFailureException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class GlobalExceptionHandler {
    @ExceptionHandler(ApiException::class)
    fun api(error: ApiException): ProblemDetail = problem(error.status, error.message)

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun invalidRequest(error: MethodArgumentNotValidException): ProblemDetail {
        val detail = error.bindingResult.fieldErrors.joinToString("; ") { "${it.field}: ${it.defaultMessage}" }
        return problem(HttpStatus.BAD_REQUEST, detail.ifBlank { "Requisição inválida" })
    }

    @ExceptionHandler(HttpMessageNotReadableException::class, ConstraintViolationException::class)
    fun malformedRequest(error: Exception): ProblemDetail = problem(HttpStatus.BAD_REQUEST, "Requisição inválida")

    @ExceptionHandler(DataIntegrityViolationException::class, ObjectOptimisticLockingFailureException::class)
    fun conflict(error: Exception): ProblemDetail = problem(HttpStatus.CONFLICT, "Conflito com o estado atual do recurso")

    private fun problem(status: HttpStatus, detail: String): ProblemDetail =
        ProblemDetail.forStatusAndDetail(status, detail)
}
