package com.syndetis.core.service

import com.syndetis.core.exception.ConflictException
import org.junit.jupiter.api.Test
import tools.jackson.databind.ObjectMapper
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class LayoutPlanPolicyTest {
    private val mapper = ObjectMapper()
    private val policy = LayoutPlanPolicy(mapper)
    private val validator = LayoutValidator(mapper)
    private fun preset(id: String) = javaClass.getResourceAsStream("/layout-templates/$id.json")!!.use(mapper::readTree)

    @Test fun `new templates allow Standard branding and keep their server owned structure`() {
        assertEquals(listOf("ecommerce", "linha", "forma", "essencial", "presenca", "impacto", "horizonte", "pulso", "ambar", "aurora", "prisma", "vetor", "eon"), policy.templateIds)
        listOf("linha", "forma", "essencial", "presenca", "impacto", "horizonte", "pulso", "ambar", "aurora", "prisma", "vetor", "eon").forEach { id ->
            val layout = preset(id)
            validator.validateAndSerialize(layout)
            policy.requireAllowed(layout, structuralEditing = false)
            assertTrue(policy.isTemplateCompatible(layout))
        }
        val branded = mapper.readTree("""{"schemaVersion":1,"templateId":"linha","theme":{"primaryColor":"#123456","backgroundColor":"#ffffff","headingFontFamily":"Newsreader, Georgia, serif","logoUrl":"https://example.test/logo.png"},"sections":[{"type":"banner","title":"Novidades"},{"type":"hero","title":"Minha marca","subtitle":"Minha descrição","buttonText":"Ver produtos","imageUrl":"https://example.test/hero.jpg","imageAlt":"Minha imagem"},{"type":"product-grid","title":"Catálogo"},{"type":"banner","title":"Nossa história","description":"Nossa descrição"},{"type":"footer","text":"Minha marca"}]}""")
        validator.validateAndSerialize(branded)
        policy.requireAllowed(branded, structuralEditing = false)
    }

    @Test fun `premium product details accept catalog binding without custom structure`() {
        val layout = mapper.readTree(mapper.writeValueAsString(preset("presenca")).replace("{\"type\":\"product-detail\"}", "{\"type\":\"product-detail\",\"productId\":\"produto-da-loja\",\"description\":\"Informações do catálogo\",\"buttonText\":\"Adicionar\"}"))
        assertEquals("produto-da-loja", layout.path("sections")[4].path("productId").asText())
        validator.validateAndSerialize(layout)
        policy.requireAllowed(layout, structuralEditing = false)
    }

    @Test fun `fixed cinematic templates accept up to three catalog images without opening structure`() {
        fun bound(ids: String) = mapper.readTree(mapper.writeValueAsString(preset("pulso")).replace("{\"type\":\"hero\"}", "{\"type\":\"hero\",\"productIds\":$ids}"))
        val allowed = bound("[\"produto-1\",\"produto-2\",\"produto-3\"]")
        assertEquals(3, allowed.path("sections")[1].path("productIds").size())
        policy.requireAllowed(allowed, structuralEditing = false)
        listOf("[\"1\",\"2\",\"3\",\"4\"]", "[1]", "[\"\"]", "\"produto-1\"").forEach { ids ->
            assertFailsWith<ConflictException> { policy.requireAllowed(bound(ids), structuralEditing = false) }
        }
    }

    @Test fun `Standard rejects rearranged sections and unknown templates while legacy still works`() {
        val unknown = mapper.readTree(mapper.writeValueAsString(preset("linha")).replace("linha", "inventado"))
        assertFailsWith<ConflictException> { policy.requireAllowed(unknown, structuralEditing = false) }
        val reordered = mapper.readTree("""{"schemaVersion":1,"templateId":"linha","theme":{},"sections":[{"type":"hero"},{"type":"banner"},{"type":"product-grid"},{"type":"banner"},{"type":"footer"}]}""")
        assertFailsWith<ConflictException> { policy.requireAllowed(reordered, structuralEditing = false) }
        policy.requireAllowed(reordered, structuralEditing = true)
        policy.requireAllowed(preset("ecommerce"), structuralEditing = false)
    }

    @Test fun supportsOpaquePhotosAndEditableFactsWithoutCustomStructure() {
        fun hero(fields: String) = mapper.readTree(mapper.writeValueAsString(preset("prisma")).replace("{\"type\":\"hero\"}", "{\"type\":\"hero\",$fields}"))
        listOf("photo", "cutout").forEach { presentation ->
            listOf("cover", "contain").forEach { fit ->
                val layout = hero(""""imageUrl":"https://example.test/photo.jpg","imagePresentation":"$presentation","imageFit":"$fit","facts":[{"label":"Material","value":"Algodão"}]""")
                validator.validateAndSerialize(layout)
                policy.requireAllowed(layout, structuralEditing = false)
            }
        }
        listOf(
            """"imageFit":"stretch"""",
            """"imagePresentation":"automatic"""",
            """"facts":{}""",
            """"facts":[{"label":"Material"}]""",
            """"facts":[{"label":"Material","value":25}]""",
            """"facts":[{"label":"Material","value":"Algodão","style":"custom"}]""",
            """"facts":[{"label":"","value":""},{"label":"","value":""},{"label":"","value":""},{"label":"","value":""}]""",
        ).forEach { fields ->
            assertFailsWith<ConflictException> { policy.requireAllowed(hero(fields), structuralEditing = false) }
        }
    }
}
