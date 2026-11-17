package com.syndetis.auth.document

import com.syndetis.auth.exception.DocumentRejectedException
import com.syndetis.auth.exception.DuplicateDocumentException
import com.syndetis.auth.model.dto.DocumentRequestDto
import com.syndetis.auth.model.enum.DocumentType
import com.syndetis.auth.repository.UserRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import java.time.LocalDate

class MerchantDocumentServiceTest {
    private val cpf = "40442820135"
    private val cnpj = "33000167000101"
    private lateinit var users: UserRepository
    private val answers = mutableListOf<Pair<String, String?>>()
    private var answer = TaxIdRecord()
    private lateinit var service: MerchantDocumentService

    @BeforeEach
    fun setUp() {
        users = mock(UserRepository::class.java)
        answers.clear()
        service = MerchantDocumentService({ digits, birth -> answers += digits to birth; answer }, users, "test-key")
    }

    @Test
    fun `an active CNPJ is confirmed with its razão social and MEI flag`() {
        answer = TaxIdRecord(type = "CNPJ", document = cnpj, status = "ACTIVE", name = "EMPRESA DEMO", mei = true)
        val confirmed = service.confirm(DocumentRequestDto("33.000.167/0001-01"))
        assertEquals(DocumentType.CNPJ, confirmed.type)
        assertEquals("33.000.167/0001-01", confirmed.display)
        assertEquals("EMPRESA DEMO", confirmed.legalName)
        assertEquals(true, confirmed.mei)
        assertEquals(listOf(cnpj to null), answers)
    }

    @Test
    fun `a regular CPF is confirmed with its birth date, stored only masked and hashed`() {
        answer = TaxIdRecord(type = "CPF", document = cpf, status = "ACTIVE", name = "RONE PEREIRA")
        val confirmed = service.confirm(DocumentRequestDto("404.428.201-35", LocalDate.of(1970, 11, 14)))
        assertEquals("***.428.201-**", confirmed.display)
        assertNull(confirmed.legalName)
        assertEquals(64, confirmed.hash.length)
        assertTrue(!confirmed.hash.contains(cpf))
        assertEquals(listOf(cpf to "1970-11-14"), answers)
        // The hash depends on the key, so a leaked table cannot be matched against a list of CPFs.
        val other = MerchantDocumentService({ _, _ -> answer }, users, "other-key").confirm(DocumentRequestDto(cpf, LocalDate.of(1970, 11, 14)))
        assertNotEquals(confirmed.hash, other.hash)
    }

    @Test
    fun `a document is refused unless the Receita Federal knows it and it is active`() {
        for ((status, message) in listOf(
            "NOT_FOUND" to "Não encontramos este CPF",
            "BIRTH_DATE_MISMATCH" to "Não encontramos este CPF",
            "UNDERAGE" to "18 anos",
            "INACTIVE" to "suspensa",
        )) {
            answer = TaxIdRecord(type = "CPF", document = cpf, status = status, registrationStatus = "SUSPENSA")
            val error = assertThrows<DocumentRejectedException> { service.confirm(DocumentRequestDto(cpf, LocalDate.of(1970, 11, 14))) }
            assertTrue(error.message!!.contains(message), error.message)
        }
        answer = TaxIdRecord(type = "CNPJ", document = cnpj, status = "INACTIVE", registrationStatus = "BAIXADA")
        assertTrue(assertThrows<DocumentRejectedException> { service.confirm(DocumentRequestDto(cnpj)) }.message!!.contains("baixada"))
    }

    @Test
    fun `a CPF needs a birth date and malformed numbers never reach the Receita Federal`() {
        assertThrows<DocumentRejectedException> { service.confirm(DocumentRequestDto(cpf)) }
        assertThrows<DocumentRejectedException> { service.confirm(DocumentRequestDto(cpf, LocalDate.now().plusDays(1))) }
        assertThrows<DocumentRejectedException> { service.confirm(DocumentRequestDto("123456789012")) }
        assertTrue(answers.isEmpty())
    }

    @Test
    fun `a document already used by another merchant is refused before any query`() {
        `when`(users.existsByDocumentHash(anyString())).thenReturn(true)
        assertThrows<DuplicateDocumentException> { service.confirm(DocumentRequestDto(cnpj)) }
        assertTrue(answers.isEmpty())
    }

    @Test
    fun `an answer about another number is not trusted`() {
        answer = TaxIdRecord(type = "CNPJ", document = "11222333000181", status = "ACTIVE")
        assertThrows<DocumentRejectedException> { service.confirm(DocumentRequestDto(cnpj)) }
    }
}
