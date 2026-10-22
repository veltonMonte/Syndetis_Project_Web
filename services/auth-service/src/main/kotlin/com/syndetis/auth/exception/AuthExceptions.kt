package com.syndetis.auth.exception

class InvalidCredentialsException : RuntimeException("Credenciais inválidas")

class DuplicateEmailException : RuntimeException("E-mail já cadastrado")
