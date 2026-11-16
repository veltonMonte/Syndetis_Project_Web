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
        val fieldErrors = error.bindingResult.fieldErrors
        val detail = fieldErrors.joinToString("; ") { "${it.field}: ${it.defaultMessage ?: "valor inválido"}" }
        val problem = problem(HttpStatus.BAD_REQUEST, detail.ifBlank { "Os dados enviados na requisição são inválidos" })
        problem.setProperty("errors", fieldErrors.associate { it.field to (it.defaultMessage ?: "valor inválido") })
        return problem
    }

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun malformedJson(error: HttpMessageNotReadableException): ProblemDetail =
        problem(HttpStatus.BAD_REQUEST, "O corpo da requisição é obrigatório e deve ser um JSON válido e bem formatado.")

    @ExceptionHandler(ConstraintViolationException::class)
    fun constraintViolation(error: ConstraintViolationException): ProblemDetail {
        val detail = error.constraintViolations.joinToString("; ") { "${it.propertyPath}: ${it.message}" }
        return problem(HttpStatus.BAD_REQUEST, detail.ifBlank { "Parâmetros da requisição inválidos" })
    }

    @ExceptionHandler(DataIntegrityViolationException::class)
    fun dataIntegrity(error: DataIntegrityViolationException): ProblemDetail =
        problem(HttpStatus.CONFLICT, "Não foi possível concluir a operação: conflito de integridade nos dados (registro duplicado ou referência inválida).")

    @ExceptionHandler(ObjectOptimisticLockingFailureException::class)
    fun optimisticLock(error: ObjectOptimisticLockingFailureException): ProblemDetail =
        problem(HttpStatus.CONFLICT, "O recurso foi modificado simultaneamente por outra operação. Por favor, recarregue e tente novamente.")

    @ExceptionHandler(IllegalArgumentException::class)
    fun illegalArgument(error: IllegalArgumentException): ProblemDetail =
        problem(HttpStatus.BAD_REQUEST, error.message ?: "Argumento inválido na requisição.")

    private fun problem(status: HttpStatus, detail: String): ProblemDetail =
        ProblemDetail.forStatusAndDetail(status, detail)
}
