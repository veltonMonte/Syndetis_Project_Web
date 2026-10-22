package com.syndetis.core.service

import com.syndetis.core.exception.BusinessRuleException
import org.junit.jupiter.api.Test
import tools.jackson.databind.ObjectMapper
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class LayoutValidatorTest {
    private val mapper = ObjectMapper()
    private val validator = LayoutValidator(mapper)

    @Test
    fun `accepts a supported e-commerce layout`() {
        val layout = mapper.readTree("""{"schemaVersion":1,"theme":{"primaryColor":"#123456"},"sections":[{"type":"product-grid"}]}""")
        assertTrue(validator.validateAndSerialize(layout).contains("product-grid"))
    }

    @Test
    fun `rejects unsupported sections and executable URLs`() {
        val unknown = mapper.readTree("""{"schemaVersion":1,"theme":{},"sections":[{"type":"script"}]}""")
        val executable = mapper.readTree("""{"schemaVersion":1,"theme":{},"sections":[{"type":"hero","imageUrl":"javascript:alert(1)"}]}""")
        assertFailsWith<BusinessRuleException> { validator.validateAndSerialize(unknown) }
        assertFailsWith<BusinessRuleException> { validator.validateAndSerialize(executable) }
    }

    @Test
    fun `rejects oversized layouts`() {
        val large = mapper.readTree("""{"schemaVersion":1,"theme":{},"sections":[{"type":"text","content":"${"x".repeat(270_000)}"}]}""")
        assertFailsWith<BusinessRuleException> { validator.validateAndSerialize(large) }
    }
}
