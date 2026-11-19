package com.syndetis.auth.exception

class InvalidCredentialsException : RuntimeException("Credenciais inválidas")

class DuplicateEmailException : RuntimeException("E-mail já cadastrado")

class InvalidRefreshTokenException : RuntimeException("Refresh token inválido")

/** The Receita Federal does not confirm the CPF or CNPJ (unknown, irregular, wrong birth date, malformed). */
class DocumentRejectedException(message: String) : RuntimeException(message)

class DuplicateDocumentException : RuntimeException("Documento já cadastrado")

/** The Receita Federal check could not run; no merchant account is created without it. */
class DocumentCheckUnavailableException : RuntimeException("Verificação de documento indisponível")

/** The signup or the acceptance names versions of the legal texts that are no longer in force. */
class OutdatedLegalVersionException : RuntimeException("Os Termos de Uso ou a Política de Privacidade foram atualizados")
