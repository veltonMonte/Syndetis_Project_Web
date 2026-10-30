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
        assertEquals(listOf("ecommerce", "linha", "forma", "essencial"), policy.templateIds)
        listOf("linha", "forma", "essencial").forEach { id ->
            val layout = preset(id)
            validator.validateAndSerialize(layout)
            policy.requireAllowed(layout, structuralEditing = false)
            assertTrue(policy.isTemplateCompatible(layout))
        }
        val branded = mapper.readTree("""{"schemaVersion":1,"templateId":"linha","theme":{"primaryColor":"#123456","backgroundColor":"#ffffff","headingFontFamily":"Newsreader, Georgia, serif","logoUrl":"https://example.test/logo.png"},"sections":[{"type":"banner","title":"Novidades"},{"type":"hero","title":"Minha marca","subtitle":"Minha descrição","buttonText":"Ver produtos","imageUrl":"https://example.test/hero.jpg","imageAlt":"Minha imagem"},{"type":"product-grid","title":"Catálogo"},{"type":"banner","title":"Nossa história","description":"Nossa descrição"},{"type":"footer","text":"Minha marca"}]}""")
        validator.validateAndSerialize(branded)
        policy.requireAllowed(branded, structuralEditing = false)
    }

    @Test fun `Standard rejects rearranged sections and unknown templates while legacy still works`() {
        val unknown = mapper.readTree(mapper.writeValueAsString(preset("linha")).replace("linha", "inventado"))
        assertFailsWith<ConflictException> { policy.requireAllowed(unknown, structuralEditing = false) }
        val reordered = mapper.readTree("""{"schemaVersion":1,"templateId":"linha","theme":{},"sections":[{"type":"hero"},{"type":"banner"},{"type":"product-grid"},{"type":"banner"},{"type":"footer"}]}""")
        assertFailsWith<ConflictException> { policy.requireAllowed(reordered, structuralEditing = false) }
        policy.requireAllowed(reordered, structuralEditing = true)
        policy.requireAllowed(preset("ecommerce"), structuralEditing = false)
    }
}
