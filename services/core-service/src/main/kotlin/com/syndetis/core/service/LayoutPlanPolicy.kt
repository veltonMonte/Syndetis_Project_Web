package com.syndetis.core.service

import com.syndetis.core.exception.ConflictException
import org.springframework.stereotype.Component
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper

/** Server-owned templates, never a skeleton supplied by the client. */
@Component
class LayoutPlanPolicy(mapper: ObjectMapper) {
    private val templates = listOf("ecommerce", "linha", "forma", "essencial", "presenca", "impacto", "horizonte", "pulso", "ambar", "aurora", "prisma", "vetor", "eon").associateWith { id ->
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
                "hero" -> setOf("title", "subtitle", "description", "imageUrl", "imageAlt", "buttonText", "buttonUrl", "productIds", "imageFit", "imagePresentation", "facts")
                "banner" -> setOf("title", "subtitle", "description", "imageUrl", "imageAlt", "buttonText", "buttonUrl")
                "product-grid", "category-list" -> setOf("title", "description")
                "product-detail" -> setOf("title", "description", "productId", "buttonText")
                "text" -> setOf("title", "body")
                "footer" -> setOf("text", "logoUrl", "copyright")
                else -> incompatible()
            }
            requireKeys(section, contentKeys + setOf("type", "theme", "id", "editorType"))
            section.properties().forEach { (key, value) ->
                when (key) {
                    "type" -> Unit
                    "theme" -> requireTheme(value)
                    "imageFit" -> if (value.asText() !in setOf("cover", "contain")) incompatible()
                    "imagePresentation" -> if (value.asText() !in setOf("photo", "cutout")) incompatible()
                    "facts" -> requireFacts(value)
                    "productIds" -> if (!value.isArray || value.size() > 3 || value.any { !it.isTextual || it.asText().isBlank() }) incompatible()
                    else -> if (!value.isTextual) incompatible()
                }
            }
        }
    }

    fun isTemplateCompatible(layout: JsonNode): Boolean = try {
        requireAllowed(layout, structuralEditing = false)
        true
    } catch (_: ConflictException) { false }

    private fun requireFacts(facts: JsonNode) {
        if (!facts.isArray || facts.size() > 3) incompatible()
        facts.forEach { fact ->
            requireKeys(fact, setOf("label", "value"))
            if (!fact.path("label").isTextual || !fact.path("value").isTextual) incompatible()
        }
    }

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
        val THEME_KEYS = setOf("brandName", "primaryColor", "backgroundColor", "textColor", "accentColor", "secondaryColor",
            "typeScale", "radius", "spacing", "fontFamily", "headingFontFamily", "bodyFontFamily", "logoUrl")
        val FONT = Regex("^[\\p{L}\\p{N} ,'\"-]{1,120}$")
    }
}
