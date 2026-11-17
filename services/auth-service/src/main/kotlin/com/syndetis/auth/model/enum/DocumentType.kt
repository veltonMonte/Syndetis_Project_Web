package com.syndetis.auth.model.enum

/** CNPJ is the only document accepted; CPF marks accounts confirmed before the CNPJ-only rule (ADR 0006). */
enum class DocumentType { CPF, CNPJ }
