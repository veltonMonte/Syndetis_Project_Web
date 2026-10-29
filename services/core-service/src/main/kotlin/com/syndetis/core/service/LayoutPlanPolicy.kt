package com.syndetis.core.service

import com.syndetis.core.exception.ConflictException
import org.springframework.stereotype.Component
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper

/** Server-owned templates, never a skeleton supplied by the client. */
@Component
class LayoutPlanPolicy(mapper: ObjectMapper) {
    private val templates = listOf("ecommerce").associateWith { id ->
        requireNotNull(javaClass.getResourceAsStream("/layout-templates/$id.json")).use(mapper::readTree)
    }
    val templateIds: List<String> = templates.keys.toList()

    fun requireAllowed(layout: JsonNode, structuralEditing: Boolean) {
        if (structuralEditing) return
        val template = templates[layout.path("templateId").asText("ecommerce")] ?: incompatible()
        requireKeys(layout, setOf("schemaVersion", "templateId", "theme", "sections"))
        requireTheme(layout.path("theme"))
        val sections = layout.path("sections")
        val expected = template.path("sections")
        if (!sections.isArray || sections.size() != expected.size()) incompatible()
        sections.forEachIndexed { index, section ->
            val type = section.path("type").asText()
            if (type != expected[index].path("type").asText()) incompatible()
            val contentKeys = when (type) {
                "hero", "banner" -> setOf("title", "subtitle", "description", "imageUrl", "imageAlt", "buttonText", "buttonUrl")
                "product-grid" -> setOf("title", "description")
                "text" -> setOf("title", "body")
                "footer" -> setOf("text", "logoUrl", "copyright")
                else -> incompatible()
            }
            requireKeys(section, contentKeys + setOf("type", "theme"))
            section.properties().forEach { (key, value) ->
                when (key) {
                    "type" -> Unit
                    "theme" -> requireTheme(value)
                    else -> if (!value.isTextual) incompatible()
                }
            }
        }
    }

    fun isTemplateCompatible(layout: JsonNode): Boolean = try {
        requireAllowed(layout, structuralEditing = false)
        true
    } catch (_: ConflictException) { false }

    private fun requireTheme(theme: JsonNode) {
        requireKeys(theme, THEME_KEYS)
        theme.properties().forEach { (key, value) ->
            if (!value.isTextual) incompatible()
            if (key.endsWith("FontFamily") || key == "fontFamily") {
                if (!FONT.matches(value.asText())) incompatible()
            }
        }
    }

    private fun requireKeys(node: JsonNode, allowed: Set<String>) {
        if (!node.isObject || node.properties().any { it.key !in allowed }) incompatible()
    }

    private fun incompatible(): Nothing = throw ConflictException(
        "O plano Standard permite conteúdo, fontes, cores, logo e imagens dentro de um template. Adeque a estrutura ao template antes de salvar ou republicar")

    private companion object {
        val THEME_KEYS = setOf("primaryColor", "backgroundColor", "textColor", "accentColor", "secondaryColor",
            "fontFamily", "headingFontFamily", "bodyFontFamily", "logoUrl")
        val FONT = Regex("^[\\p{L}\\p{N} ,'\"-]{1,120}$")
    }
}
