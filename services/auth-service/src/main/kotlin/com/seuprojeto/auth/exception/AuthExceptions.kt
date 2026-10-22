package com.seuprojeto.auth.exception

class InvalidCredentialsException : RuntimeException("Credenciais inválidas")

class DuplicateEmailException : RuntimeException("E-mail já cadastrado")
