package com.syndetis.core.model.entity

import java.security.SecureRandom

/**
 * Purchase code a buyer uses to follow an order without signing in.
 *
 * Eight Crockford Base32 characters (about 40 random bits), shown as `XXXX-XXXX`. The alphabet has no
 * I, L, O or U, and reading accepts the usual confusions (O→0, I/L→1), case and the dash.
 */
object OrderCode {
    private const val ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
    const val LENGTH = 8
    private val random = SecureRandom()

    fun generate(): String = buildString(LENGTH) {
        repeat(LENGTH) { append(ALPHABET[random.nextInt(ALPHABET.length)]) }
    }

    /** Canonical stored form, or null when the input cannot be a purchase code. */
    fun normalize(input: String): String? {
        val compact = input.trim().uppercase()
            .filterNot { it == '-' || it == ' ' }
            .map { when (it) { 'O' -> '0'; 'I', 'L' -> '1'; else -> it } }
            .joinToString("")
        return compact.takeIf { it.length == LENGTH && it.all(ALPHABET::contains) }
    }

    fun format(code: String): String = code.substring(0, LENGTH / 2) + "-" + code.substring(LENGTH / 2)
}
