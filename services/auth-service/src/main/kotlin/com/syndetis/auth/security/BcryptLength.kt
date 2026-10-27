package com.syndetis.auth.security

import jakarta.validation.Constraint
import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext
import jakarta.validation.Payload
import kotlin.reflect.KClass

/** BCrypt aceita no máximo 72 bytes UTF-8, não 72 caracteres. */
@Target(AnnotationTarget.FIELD, AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
@Constraint(validatedBy = [BcryptLengthValidator::class])
annotation class BcryptLength(
    val message: String = "A senha deve ter no máximo 72 bytes em UTF-8",
    val groups: Array<KClass<*>> = [],
    val payload: Array<KClass<out Payload>> = [],
)

class BcryptLengthValidator : ConstraintValidator<BcryptLength, String> {
    override fun isValid(value: String?, context: ConstraintValidatorContext): Boolean =
        value == null || (value.length <= 72 && value.toByteArray(Charsets.UTF_8).size <= 72)
}
