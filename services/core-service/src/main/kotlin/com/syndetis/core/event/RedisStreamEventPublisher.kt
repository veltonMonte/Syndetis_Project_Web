package com.syndetis.core.event

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.data.redis.connection.stream.StreamRecords
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Component
import tools.jackson.databind.ObjectMapper

@Component
@ConditionalOnProperty(name = ["core.events.enabled"], havingValue = "true", matchIfMissing = true)
class RedisStreamEventPublisher(
    private val redisTemplate: StringRedisTemplate,
    private val objectMapper: ObjectMapper,
    @Value("\${core.events.stream:syndetis:core-events}") private val streamKey: String,
) : CoreEventPublisher {
    private val logger = LoggerFactory.getLogger(RedisStreamEventPublisher::class.java)

    override fun publish(event: CoreEvent) {
        try {
            val json = objectMapper.writeValueAsString(event)
            val record = StreamRecords.string(mapOf("event" to json)).withStreamKey(streamKey)
            val recordId = redisTemplate.opsForStream<String, String>().add(record)
            logger.info("Publicou evento {} ({}) no Redis Stream {} com id {}", event.type, event.id, streamKey, recordId)
        } catch (e: Exception) {
            logger.error("Falha ao publicar evento {} ({}) no Redis Stream {}", event.type, event.id, streamKey, e)
        }
    }
}

@Component
@ConditionalOnProperty(name = ["core.events.enabled"], havingValue = "false")
class NoOpCoreEventPublisher : CoreEventPublisher {
    private val logger = LoggerFactory.getLogger(NoOpCoreEventPublisher::class.java)

    override fun publish(event: CoreEvent) {
        logger.debug("Eventos desabilitados; ignorando evento {} ({})", event.type, event.id)
    }
}
