package com.syndetis.auth.document

import com.syndetis.auth.exception.DocumentRejectedException
import com.syndetis.auth.exception.DuplicateDocumentException
import com.syndetis.auth.model.dto.DocumentRequestDto
import com.syndetis.auth.model.enum.DocumentType
import com.syndetis.auth.repository.UserRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`

class MerchantDocumentServiceTest {
    private val cnpj = "33000167000101"
    private lateinit var users: UserRepository
    private val asked = mutableListOf<String>()
    private var answer = TaxIdRecord()
    private lateinit var service: MerchantDocumentService

    @BeforeEach
    fun setUp() {
        users = mock(UserRepository::class.java)
        asked.clear()
        service = MerchantDocumentService({ digits -> asked += digits; answer }, users, "test-key")
    }

    @Test
    fun `an active CNPJ is confirmed with its razão social and MEI flag`() {
        answer = TaxIdRecord(type = "CNPJ", document = cnpj, status = "ACTIVE", name = "EMPRESA DEMO", mei = true)
        val confirmed = service.confirm(DocumentRequestDto("33.000.167/0001-01"))
        assertEquals(DocumentType.CNPJ, confirmed.type)
        assertEquals("33.000.167/0001-01", confirmed.display)
        assertEquals("EMPRESA DEMO", confirmed.legalName)
        assertEquals(true, confirmed.mei)
        assertEquals(64, confirmed.hash.length)
        assertEquals(listOf(cnpj), asked)
        // The hash depends on the key, so a leaked table cannot be matched against a list of CNPJs.
        val other = MerchantDocumentService({ _ -> answer }, users, "other-key").confirm(DocumentRequestDto(cnpj))
        assertNotEquals(confirmed.hash, other.hash)
    }

    @Test
    fun `a CPF is refused before any query, as a fraud barrier`() {
        val error = assertThrows<DocumentRejectedException> { service.confirm(DocumentRequestDto("404.428.201-35")) }
        assertEquals("Contas de lojista usam o CNPJ da loja, não CPF.", error.message)
        assertThrows<DocumentRejectedException> { service.confirm(DocumentRequestDto("123456789012")) }
        assertTrue(asked.isEmpty())
    }

    @Test
    fun `a CNPJ is refused unless the Receita Federal knows it and it is active`() {
        answer = TaxIdRecord(type = "CNPJ", document = cnpj, status = "NOT_FOUND")
        assertEquals("Este CNPJ não existe na Receita Federal.",
            assertThrows<DocumentRejectedException> { service.confirm(DocumentRequestDto(cnpj)) }.message)
        answer = TaxIdRecord(type = "CNPJ", document = cnpj, status = "INACTIVE", registrationStatus = "BAIXADA")
        assertTrue(assertThrows<DocumentRejectedException> { service.confirm(DocumentRequestDto(cnpj)) }.message!!.contains("baixada"))
    }

    @Test
    fun `a CNPJ already used by another merchant is refused before any query`() {
        `when`(users.existsByDocumentHash(anyString())).thenReturn(true)
        assertThrows<DuplicateDocumentException> { service.confirm(DocumentRequestDto(cnpj)) }
        assertTrue(asked.isEmpty())
    }

    @Test
    fun `an answer about another number is not trusted`() {
        answer = TaxIdRecord(type = "CNPJ", document = "11222333000181", status = "ACTIVE")
        assertThrows<DocumentRejectedException> { service.confirm(DocumentRequestDto(cnpj)) }
    }
}
