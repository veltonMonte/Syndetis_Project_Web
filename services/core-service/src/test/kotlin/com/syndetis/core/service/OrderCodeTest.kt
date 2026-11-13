package com.syndetis.core.service

import com.syndetis.core.model.entity.OrderCode
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class OrderCodeTest {
    @Test
    fun `generated codes use the unambiguous alphabet and are random`() {
        val codes = List(2000) { OrderCode.generate() }
        assertTrue(codes.all { it.length == 8 && it.none { c -> c in "ILOU" } && it == OrderCode.normalize(it) })
        assertEquals(codes.size, codes.toSet().size)
    }

    @Test
    fun `reading accepts case, dash, spaces and the usual confusions`() {
        assertEquals("7K0M2XP1", OrderCode.normalize("7k0m-2xp1"))
        assertEquals("7K0M2XP1", OrderCode.normalize(" 7KOM 2XPL "))
        assertEquals("7K0M2XP1", OrderCode.normalize("7K0M2XPI"))
        assertEquals("7K0M-2XP1", OrderCode.format("7K0M2XP1"))
    }

    @Test
    fun `anything that cannot be a code is refused`() {
        for (input in listOf("", "7K0M2XP", "7K0M2XP12", "7K0M-2XU1", "../../etc", "7K0M2XP!")) assertNull(OrderCode.normalize(input), input)
    }
}
