package com.syndetis.core.config

import org.junit.jupiter.api.Test
import org.springframework.boot.SpringApplication
import org.springframework.mock.env.MockEnvironment
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class DatabaseUrlTest {
    private val neon = "postgresql://neondb_owner:fixture-S3cr%40t@ep-cool-frog-a1b2c3.us-east-2.aws.neon.tech/syndetis_core?sslmode=require&channel_binding=require"

    @Test
    fun `Neon URL becomes a verified TLS JDBC connection`() {
        val parsed = DatabaseUrl.parse(neon, "core-service")
        assertEquals("neondb_owner", parsed.username)
        assertEquals("fixture-S3cr@t", parsed.password)
        assertEquals(
            "jdbc:postgresql://ep-cool-frog-a1b2c3.us-east-2.aws.neon.tech:5432/syndetis_core" +
                "?sslmode=verify-full&sslfactory=org.postgresql.ssl.DefaultJavaSSLFactory" +
                "&channelBinding=require&ApplicationName=core-service",
            parsed.jdbcUrl,
        )
        assertFalse("S3cr" in parsed.toString(), "a senha nunca aparece no toString")
    }

    @Test
    fun `TLS is mandatory and defaults to verified when sslmode is missing`() {
        for (mode in listOf("disable", "allow", "prefer")) {
            val error = assertFailsWith<IllegalStateException> {
                DatabaseUrl.parse("postgresql://u:p@db.example/app?sslmode=$mode")
            }
            assertTrue("TLS" in error.message!!)
        }
        assertTrue(DatabaseUrl.parse("postgres://u:p@db.example:6543/app").jdbcUrl.startsWith(
            "jdbc:postgresql://db.example:6543/app?sslmode=verify-full"))
    }

    @Test
    fun `invalid URLs fail without echoing the password`() {
        for (raw in listOf("mysql://u:segredo@h/db", "postgresql://h/db", "postgresql://u:segredo@h/", "postgresql://u:segredo@/db", "::not a url::segredo")) {
            val error = assertFailsWith<IllegalStateException>(raw) { DatabaseUrl.parse(raw) }
            assertFalse("segredo" in error.message!!, raw)
        }
    }

    @Test
    fun `without DATABASE_URL the POSTGRES variables keep working`() {
        val environment = MockEnvironment()
        DatabaseUrlEnvironmentPostProcessor().postProcessEnvironment(environment, SpringApplication())
        assertNull(environment.propertySources.get(DatabaseUrlEnvironmentPostProcessor.SOURCE_NAME))

        environment.setProperty("DATABASE_URL", "   ")
        DatabaseUrlEnvironmentPostProcessor().postProcessEnvironment(environment, SpringApplication())
        assertNull(environment.propertySources.get(DatabaseUrlEnvironmentPostProcessor.SOURCE_NAME))
    }

    @Test
    fun `DATABASE_URL takes precedence over the datasource properties`() {
        val environment = MockEnvironment()
            .withProperty("spring.datasource.url", "jdbc:postgresql://localhost:5432/syndetis_core")
            .withProperty("spring.application.name", "core-service")
            .withProperty("DATABASE_URL", neon)
        DatabaseUrlEnvironmentPostProcessor().postProcessEnvironment(environment, SpringApplication())
        assertTrue(environment.getProperty("spring.datasource.url")!!.contains("neon.tech"))
        assertEquals("neondb_owner", environment.getProperty("spring.datasource.username"))
    }
}
