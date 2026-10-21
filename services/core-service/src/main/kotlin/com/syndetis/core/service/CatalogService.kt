package com.syndetis.core.service

import com.syndetis.core.exception.BusinessRuleException
import com.syndetis.core.exception.ConflictException
import com.syndetis.core.exception.NotFoundException
import com.syndetis.core.model.dto.catalog.CategoryRequest
import com.syndetis.core.model.dto.catalog.CategoryResponse
import com.syndetis.core.model.dto.catalog.ProductRequest
import com.syndetis.core.model.dto.catalog.ProductResponse
import com.syndetis.core.model.dto.catalog.toResponse
import com.syndetis.core.model.dto.common.PageResponse
import com.syndetis.core.model.dto.common.toResponse
import com.syndetis.core.model.entity.Category
import com.syndetis.core.model.entity.Product
import com.syndetis.core.model.entity.StoreStatus
import com.syndetis.core.repository.CategoryRepository
import com.syndetis.core.repository.ProductRepository
import com.syndetis.core.repository.StoreRepository
import com.syndetis.core.security.StoreAccessGuard
import jakarta.persistence.criteria.Predicate
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.net.URI
import java.time.Instant
import java.util.UUID

@Service
class CatalogService(
    private val stores: StoreRepository,
    private val categories: CategoryRepository,
    private val products: ProductRepository,
    private val access: StoreAccessGuard,
    private val inventory: InventoryService,
) {
    @Transactional(readOnly = true)
    fun publicCategories(slug: String): List<CategoryResponse> =
        categories.findAllByStoreIdOrderByPositionAscNameAsc(publicStoreId(slug)).map { it.toResponse() }

    @Transactional(readOnly = true)
    fun publicProducts(slug: String, categoryId: UUID?, query: String?, page: Int, size: Int, sort: String): PageResponse<ProductResponse> =
        products.findAll(productFilter(publicStoreId(slug), true, categoryId, query), pageRequest(page, size, sort))
            .toResponse { it.toResponse() }

    @Transactional(readOnly = true)
    fun publicProduct(slug: String, productId: UUID): ProductResponse {
        val storeId = publicStoreId(slug)
        return products.findById(productId).orElseThrow { NotFoundException("Produto não encontrado") }
            .takeIf { it.storeId == storeId && it.active }
            ?.toResponse() ?: throw NotFoundException("Produto não encontrado")
    }

    @Transactional(readOnly = true)
    fun sellerCategories(storeId: UUID): List<CategoryResponse> {
        access.forRead(storeId)
        return categories.findAllByStoreIdOrderByPositionAscNameAsc(storeId).map { it.toResponse() }
    }

    @Transactional(readOnly = true)
    fun sellerCategory(storeId: UUID, categoryId: UUID): CategoryResponse {
        access.forRead(storeId)
        return ownedCategory(storeId, categoryId).toResponse()
    }

    @Transactional
    fun createCategory(storeId: UUID, request: CategoryRequest): CategoryResponse {
        access.forManage(storeId)
        if (categories.existsByStoreIdAndSlug(storeId, request.slug)) throw ConflictException("Slug da categoria já existe")
        return categories.save(Category(storeId = storeId, name = request.name.trim(), slug = request.slug, position = request.position)).toResponse()
    }

    @Transactional
    fun updateCategory(storeId: UUID, categoryId: UUID, request: CategoryRequest): CategoryResponse {
        access.forManage(storeId)
        val category = ownedCategory(storeId, categoryId)
        category.name = request.name.trim()
        category.slug = request.slug
        category.position = request.position
        categories.flush()
        return category.toResponse()
    }

    @Transactional
    fun deleteCategory(storeId: UUID, categoryId: UUID) {
        access.forManage(storeId)
        val category = ownedCategory(storeId, categoryId)
        if (products.existsByCategoryId(categoryId)) throw ConflictException("Categoria contém produtos")
        categories.delete(category)
    }

    @Transactional(readOnly = true)
    fun sellerProducts(storeId: UUID, categoryId: UUID?, query: String?, page: Int, size: Int, sort: String): PageResponse<ProductResponse> {
        access.forRead(storeId)
        return products.findAll(productFilter(storeId, false, categoryId, query), pageRequest(page, size, sort))
            .toResponse { it.toResponse() }
    }

    @Transactional(readOnly = true)
    fun sellerProduct(storeId: UUID, productId: UUID): ProductResponse {
        access.forRead(storeId)
        return ownedProduct(storeId, productId).toResponse()
    }

    @Transactional
    fun createProduct(storeId: UUID, request: ProductRequest): ProductResponse {
        access.forManage(storeId)
        validateProductRequest(storeId, request)
        if (products.existsByStoreIdAndSku(storeId, request.sku)) throw ConflictException("SKU já existe nesta loja")
        val product = products.save(Product(storeId = storeId, name = request.name.trim(), description = request.description,
            price = request.price, sku = request.sku, imageUrl = request.imageUrl, categoryId = request.categoryId,
            active = request.active))
        inventory.createForProduct(product.id)
        return product.toResponse()
    }

    @Transactional
    fun updateProduct(storeId: UUID, productId: UUID, request: ProductRequest): ProductResponse {
        access.forManage(storeId)
        validateProductRequest(storeId, request)
        val product = ownedProduct(storeId, productId)
        product.name = request.name.trim()
        product.description = request.description
        product.price = request.price
        product.sku = request.sku
        product.imageUrl = request.imageUrl
        product.categoryId = request.categoryId
        product.active = request.active
        product.updatedAt = Instant.now()
        products.flush()
        return product.toResponse()
    }

    @Transactional
    fun deleteProduct(storeId: UUID, productId: UUID) {
        access.forManage(storeId)
        ownedProduct(storeId, productId).apply { active = false; updatedAt = Instant.now() }
    }

    private fun ownedCategory(storeId: UUID, categoryId: UUID): Category =
        categories.findById(categoryId).orElseThrow { NotFoundException("Categoria não encontrada") }
            .takeIf { it.storeId == storeId } ?: throw NotFoundException("Categoria não encontrada")

    private fun ownedProduct(storeId: UUID, productId: UUID): Product =
        products.findById(productId).orElseThrow { NotFoundException("Produto não encontrado") }
            .takeIf { it.storeId == storeId } ?: throw NotFoundException("Produto não encontrado")

    private fun publicStoreId(slug: String): UUID = stores.findBySlug(slug)
        ?.takeIf { it.status == StoreStatus.ACTIVE }?.id ?: throw NotFoundException("Loja não encontrada")

    private fun validateProductRequest(storeId: UUID, request: ProductRequest) {
        request.categoryId?.let { ownedCategory(storeId, it) }
        request.imageUrl?.let { raw ->
            val uri = runCatching { URI(raw) }.getOrNull()
            if (uri?.scheme?.lowercase() !in setOf("http", "https") || uri?.host.isNullOrBlank()) {
                throw BusinessRuleException("imageUrl deve usar http ou https")
            }
        }
    }

    private fun productFilter(storeId: UUID, activeOnly: Boolean, categoryId: UUID?, query: String?): Specification<Product> {
        val text = query?.trim()?.takeIf { it.isNotEmpty() }
        if (text != null && text.length > 100) throw BusinessRuleException("Busca excede 100 caracteres")
        return Specification { root, _, criteria ->
            val filters = mutableListOf<Predicate>(criteria.equal(root.get<UUID>("storeId"), storeId))
            if (activeOnly) filters.add(criteria.isTrue(root.get("active")))
            if (categoryId != null) filters.add(criteria.equal(root.get<UUID>("categoryId"), categoryId))
            if (text != null) {
                val escaped = text.lowercase().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
                filters.add(criteria.like(criteria.lower(root.get("name")), "%$escaped%", '\\'))
            }
            criteria.and(*filters.toTypedArray())
        }
    }

    private fun pageRequest(page: Int, size: Int, sort: String): PageRequest {
        if (page < 0 || size !in 1..100) throw BusinessRuleException("Paginação inválida")
        val parts = sort.split(',')
        val field = parts[0].takeIf { it in setOf("name", "price", "createdAt") }
            ?: throw BusinessRuleException("Ordenação inválida")
        val direction = when (parts.getOrNull(1)?.lowercase() ?: "asc") {
            "asc" -> Sort.Direction.ASC
            "desc" -> Sort.Direction.DESC
            else -> throw BusinessRuleException("Direção de ordenação inválida")
        }
        if (parts.size > 2) throw BusinessRuleException("Ordenação inválida")
        return PageRequest.of(page, size, Sort.by(direction, field).and(Sort.by("id")))
    }
}
