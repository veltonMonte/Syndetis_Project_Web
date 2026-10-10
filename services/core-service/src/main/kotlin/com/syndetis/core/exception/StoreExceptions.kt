package com.syndetis.core.exception

class SlugAlreadyExistsException(
    message: String = "Já existe uma loja cadastrada com este slug"
) : RuntimeException(message)
class StoreNotFoundException(
    message: String = "Loja não encontrada"
) : RuntimeException(message)

class LayoutConfigNotFoundException(
    message: String = "Configuração de layout não encontrada"
) : RuntimeException(message)

class StoreAccessDeniedException(
    message: String = "Você não tem permissão para gerenciar esta loja"
) : RuntimeException(message)
