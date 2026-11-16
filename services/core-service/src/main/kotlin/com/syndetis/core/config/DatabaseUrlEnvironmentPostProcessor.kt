package com.syndetis.core.config

import org.springframework.boot.EnvironmentPostProcessor
import org.springframework.boot.SpringApplication
import org.springframework.core.Ordered
import org.springframework.core.env.ConfigurableEnvironment
import org.springframework.core.env.MapPropertySource
import java.net.URI
import java.net.URLDecoder
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

/**
 * Accepts a libpq-style DATABASE_URL (`postgresql://user:password@host/db?sslmode=require`), the form
 * Neon and most providers hand out, and turns it into the JDBC settings Spring, Hikari and Flyway use.
 *
 * Without DATABASE_URL nothing changes: POSTGRES_HOST/PORT/USER/PASSWORD keep working (local Compose,
 * Testcontainers, RDS). With it, TLS is mandatory and the server certificate is verified.
 */
class DatabaseUrlEnvironmentPostProcessor : EnvironmentPostProcessor, Ordered {
    override fun postProcessEnvironment(environment: ConfigurableEnvironment, application: SpringApplication) {
        val raw = environment.getProperty("DATABASE_URL")?.trim()?.takeIf { it.isNotEmpty() } ?: return
        val settings = DatabaseUrl.parse(raw, environment.getProperty("spring.application.name"))
        environment.propertySources.addFirst(MapPropertySource(SOURCE_NAME, settings.toProperties()))
    }

    // After config data, so DATABASE_URL may come from the environment or any properties file.
    override fun getOrder() = Ordered.LOWEST_PRECEDENCE

    companion object {
        const val SOURCE_NAME = "databaseUrl"
    }
}

data class DatabaseUrl(val jdbcUrl: String, val username: String, val password: String) {
    fun toProperties(): Map<String, Any> = mapOf(
        "spring.datasource.url" to jdbcUrl,
        "spring.datasource.username" to username,
        "spring.datasource.password" to password,
    )

    // Never print the password, even by accident in a log line.
    override fun toString() = "DatabaseUrl(jdbcUrl=$jdbcUrl, username=$username, password=***)"

    companion object {
        private val INSECURE_SSL_MODES = setOf("disable", "allow", "prefer")
        /** libpq parameters that have a different name (or no meaning) in pgjdbc. */
        private val RENAMED = mapOf("channel_binding" to "channelBinding", "application_name" to "ApplicationName")
        private val DROPPED = setOf("sslmode", "sslrootcert", "sslfactory", "connect_timeout")

        fun parse(raw: String, applicationName: String? = null): DatabaseUrl {
            val uri = try {
                URI(raw)
            } catch (exception: Exception) {
                // The message must not echo the URL: it holds the password.
                throw IllegalStateException("DATABASE_URL não é uma URL válida.")
            }
            check(uri.scheme == "postgres" || uri.scheme == "postgresql") {
                "DATABASE_URL deve começar com postgresql:// (recebido: ${uri.scheme ?: "sem esquema"})."
            }
            val host = uri.host?.takeIf { it.isNotBlank() } ?: throw IllegalStateException("DATABASE_URL não informa o host.")
            val database = uri.rawPath?.removePrefix("/")?.let(::decode)?.takeIf { it.isNotBlank() }
                ?: throw IllegalStateException("DATABASE_URL não informa o banco de dados.")
            val userInfo = uri.rawUserInfo ?: throw IllegalStateException("DATABASE_URL não informa usuário e senha.")
            val username = decode(userInfo.substringBefore(':'))
            val password = decode(userInfo.substringAfter(':', ""))
            check(username.isNotBlank() && password.isNotEmpty()) { "DATABASE_URL não informa usuário e senha." }

            val query = parseQuery(uri.rawQuery)
            val sslMode = query["sslmode"]?.lowercase() ?: "require"
            check(sslMode !in INSECURE_SSL_MODES) {
                "DATABASE_URL precisa de TLS: use sslmode=require ou verify-full (recebido: $sslMode)."
            }
            val jdbcParams = linkedMapOf(
                // require and verify-ca are raised to verify-full: the connection is encrypted and the
                // server's certificate and host name are checked against the JVM trust store.
                "sslmode" to "verify-full",
                "sslfactory" to "org.postgresql.ssl.DefaultJavaSSLFactory",
            )
            for ((key, value) in query) {
                if (key in DROPPED) continue
                jdbcParams[RENAMED[key] ?: key] = value
            }
            if (applicationName != null) jdbcParams.putIfAbsent("ApplicationName", applicationName)

            val port = if (uri.port > 0) uri.port else 5432
            val jdbcUrl = "jdbc:postgresql://$host:$port/${encode(database)}?" +
                jdbcParams.entries.joinToString("&") { (key, value) -> "${encode(key)}=${encode(value)}" }
            return DatabaseUrl(jdbcUrl, username, password)
        }

        private fun parseQuery(rawQuery: String?): Map<String, String> =
            rawQuery.orEmpty().split('&').filter { it.isNotBlank() }.associate { pair ->
                decode(pair.substringBefore('=')) to decode(pair.substringAfter('=', ""))
            }

        private fun decode(value: String) = URLDecoder.decode(value, StandardCharsets.UTF_8)
        private fun encode(value: String) = URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20")
    }
}
