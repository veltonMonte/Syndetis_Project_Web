package com.syndetis.core.service

import com.syndetis.core.exception.BusinessRuleException
import org.springframework.stereotype.Component
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.net.URI

@Component
class LayoutValidator(private val mapper: ObjectMapper) {
    fun validateAndSerialize(layout: JsonNode): String {
        val serialized = mapper.writeValueAsString(layout)
        if (serialized.toByteArray(Charsets.UTF_8).size > MAX_BYTES) {
            throw BusinessRuleException("Layout excede 256 KB")
        }
        if (!layout.isObject || layout.path("schemaVersion").asInt(-1) != 1) {
            throw BusinessRuleException("schemaVersion deve ser 1")
        }
        val theme = layout.path("theme")
        val sections = layout.path("sections")
        if (!theme.isObject || !sections.isArray || sections.isEmpty) {
            throw BusinessRuleException("theme e sections[] são obrigatórios")
        }
        sections.forEach { section ->
            if (!section.isObject || section.path("type").asText() !in SECTION_TYPES) {
                throw BusinessRuleException("Tipo de seção não permitido")
            }
        }
        val themeBounds = mapOf("typeScale" to 0.8..1.4, "radius" to 0.0..1.0, "spacing" to 0.0..64.0)
        themeBounds.forEach { (key, bounds) ->
            if (theme.has(key)) {
                val value = theme.path(key).asText().toDoubleOrNull()
                if (value == null || !value.isFinite() || value !in bounds || (key == "spacing" && value % 1.0 != 0.0))
                    throw BusinessRuleException("Token de tema fora do limite permitido")
            }
        }
        checkFields(layout)
        return serialized
    }

    fun requireSystemSectionsPreserved(previous: JsonNode, next: JsonNode) {
        if (previous.path("sections").any { it.path("type").asText() == "footer" } &&
            next.path("sections").none { it.path("type").asText() == "footer" }) {
            throw BusinessRuleException("O rodapé de sistema não pode ser removido")
        }
    }

    private fun checkFields(root: JsonNode) {
        val pending = ArrayDeque<Pair<JsonNode, Int>>()
        pending.add(root to 0)
        while (pending.isNotEmpty()) {
            val (node, depth) = pending.removeFirst()
            if (depth > MAX_DEPTH) throw BusinessRuleException("Layout excede a profundidade permitida")
            if (node.isArray) node.forEach { pending.add(it to depth + 1) }
            if (node.isObject) node.properties().forEach { (name, value) ->
                if (name.endsWith("url", ignoreCase = true)) validateUrl(value)
                if (name.endsWith("color", ignoreCase = true)) validateColor(value)
                pending.add(value to depth + 1)
            }
        }
    }

    private fun validateUrl(node: JsonNode) {
        val uri = runCatching { URI(node.asText()) }.getOrNull()
        if (!node.isTextual || uri?.scheme?.lowercase() !in setOf("http", "https") || uri?.host.isNullOrBlank()) {
            throw BusinessRuleException("URL deve usar http ou https")
        }
    }

    private fun validateColor(node: JsonNode) {
        if (!node.isTextual || !COLOR.matches(node.asText())) {
            throw BusinessRuleException("Cor deve usar formato hexadecimal ou hsl()")
        }
    }

    private companion object {
        const val MAX_BYTES = 256 * 1024
        const val MAX_DEPTH = 32
        val SECTION_TYPES = setOf("hero", "product-grid", "product-detail", "category-list", "banner", "text", "footer")
        val COLOR = Regex("^(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?|hsl\\([0-9]{1,3},\\s*[0-9]{1,3}%,\\s*[0-9]{1,3}%\\))$")
    }
}
