package com.syndetis.core.exception

import org.springframework.http.HttpStatus

sealed class ApiException(
    val status: HttpStatus,
    override val message: String,
) : RuntimeException(message)

class NotFoundException(message: String) : ApiException(HttpStatus.NOT_FOUND, message)
class ForbiddenException(message: String) : ApiException(HttpStatus.FORBIDDEN, message)
class ConflictException(message: String) : ApiException(HttpStatus.CONFLICT, message)
class BusinessRuleException(message: String) : ApiException(HttpStatus.BAD_REQUEST, message)
class ServiceUnavailableException(message: String) : ApiException(HttpStatus.SERVICE_UNAVAILABLE, message)
