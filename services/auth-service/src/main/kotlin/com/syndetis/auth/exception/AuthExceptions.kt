package com.syndetis.auth.exception

class InvalidCredentialsException : RuntimeException("Credenciais inválidas")

class DuplicateEmailException : RuntimeException("E-mail já cadastrado")

class InvalidRefreshTokenException : RuntimeException("Refresh token inválido")
