package com.syndetis.auth.exception

class InvalidCredentialsException : RuntimeException("Credenciais inválidas")

class DuplicateEmailException : RuntimeException("E-mail já cadastrado")

class InvalidRefreshTokenException : RuntimeException("Refresh token inválido")

/** The Receita Federal does not confirm the CNPJ (unknown, not active, malformed), or a CPF was sent. */
class DocumentRejectedException(message: String) : RuntimeException(message)

class DuplicateDocumentException : RuntimeException("Documento já cadastrado")

/** The Receita Federal check could not run; no merchant account is created without it. */
class DocumentCheckUnavailableException : RuntimeException("Verificação de documento indisponível")
