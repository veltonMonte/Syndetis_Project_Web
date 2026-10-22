package com.syndetis.core.security

import com.syndetis.core.exception.ForbiddenException
import com.syndetis.core.exception.NotFoundException
import com.syndetis.core.model.entity.Store
import com.syndetis.core.repository.StoreRepository
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class StoreAccessGuard(
    private val stores: StoreRepository,
    private val currentUser: CurrentUser,
) {
    fun forRead(storeId: UUID): Store = stores.findById(storeId)
        .orElseThrow { NotFoundException("Loja não encontrada") }
        .also { store ->
            if (!currentUser.isAdmin() && store.ownerUserId != currentUser.id()) {
                throw NotFoundException("Loja não encontrada")
            }
        }

    fun forManage(storeId: UUID): Store = stores.findById(storeId)
        .orElseThrow { NotFoundException("Loja não encontrada") }
        .also { store ->
            if (!currentUser.isAdmin() && store.ownerUserId != currentUser.id()) {
                throw ForbiddenException("Você não pode alterar esta loja")
            }
        }
}
