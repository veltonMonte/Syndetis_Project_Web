package com.syndetis.core.event

import com.syndetis.core.model.entity.Customer
import com.syndetis.core.repository.CustomerRepository
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import org.springframework.data.redis.connection.stream.MapRecord
import org.springframework.data.redis.connection.stream.RecordId
import org.springframework.data.redis.core.StreamOperations
import org.springframework.data.redis.core.StringRedisTemplate
import tools.jackson.databind.ObjectMapper
import java.math.BigDecimal
import java.util.Optional
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class OrderEventListenerTest {

    private class RecordingCoreEventPublisher : CoreEventPublisher {
        val publishedEvents = mutableListOf<CoreEvent>()
        override fun publish(event: CoreEvent) {
            publishedEvents.add(event)
        }
    }

    private val customerRepository = mock(CustomerRepository::class.java)
    private val publisher = RecordingCoreEventPublisher()
    private val listener = OrderEventListener(publisher, customerRepository)

    @Test
    fun `handleOrderDomainEvent publishes formatted CoreEvent when customer exists`() {
        val customerId = UUID.randomUUID()
        val orderId = UUID.randomUUID()
        val storeId = UUID.randomUUID()
        val customer = Customer(
            id = customerId,
            name = "Maria Silva",
            email = "maria@example.com",
            phone = "11988887777",
        )
        `when`(customerRepository.findById(customerId)).thenReturn(Optional.of(customer))

        val domainEvent = OrderDomainEvent(
            orderId = orderId,
            storeId = storeId,
            customerId = customerId,
            total = BigDecimal("149.90"),
            type = "order.created",
        )

        listener.handleOrderDomainEvent(domainEvent)

        assertEquals(1, publisher.publishedEvents.size)
        val published = publisher.publishedEvents.first()

        assertEquals("order.created", published.type)
        assertEquals(1, published.version)
        assertNotNull(published.id)
        assertNotNull(published.occurredAt)
        assertEquals(orderId, published.data.orderId)
        assertEquals(storeId, published.data.storeId)
        assertEquals("149.90", published.data.total)
        assertEquals("Maria Silva", published.data.customer.name)
        assertEquals("maria@example.com", published.data.customer.email)
        assertEquals("11988887777", published.data.customer.phone)
    }

    @Test
    fun `handleOrderDomainEvent ignores event when customer not found`() {
        val customerId = UUID.randomUUID()
        `when`(customerRepository.findById(customerId)).thenReturn(Optional.empty())

        val domainEvent = OrderDomainEvent(
            orderId = UUID.randomUUID(),
            storeId = UUID.randomUUID(),
            customerId = customerId,
            total = BigDecimal("50.00"),
            type = "order.canceled",
        )

        listener.handleOrderDomainEvent(domainEvent)
        assertTrue(publisher.publishedEvents.isEmpty())
    }

    @Test
    fun `RedisStreamEventPublisher serializes to JSON and adds to redis stream`() {
        @Suppress("UNCHECKED_CAST")
        val streamOps = mock(StreamOperations::class.java) as StreamOperations<String, String, String>
        val redisTemplate = mock(StringRedisTemplate::class.java)
        `when`(redisTemplate.opsForStream<String, String>()).thenReturn(streamOps)
        val objectMapper = ObjectMapper()

        var capturedRecord: MapRecord<String, String, String>? = null
        `when`(streamOps.add(any())).thenAnswer { invocation ->
            @Suppress("UNCHECKED_CAST")
            capturedRecord = invocation.getArgument(0) as MapRecord<String, String, String>
            RecordId.of("1-0")
        }

        val redisPublisher = RedisStreamEventPublisher(
            redisTemplate = redisTemplate,
            objectMapper = objectMapper,
            streamKey = "syndetis:core-events",
        )

        val coreEvent = CoreEvent(
            id = UUID.fromString("c1a2b3c4-d5e6-4f70-8a9b-0c1d2e3f4a5b"),
            type = "order.paid",
            occurredAt = "2026-10-23T00:00:00Z",
            version = 1,
            data = OrderEventData(
                orderId = UUID.fromString("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"),
                storeId = UUID.fromString("b1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"),
                total = "149.90",
                customer = OrderCustomerEvent(
                    name = "Ana",
                    email = "ana@example.com",
                    phone = "(11) 98888-7777",
                ),
            ),
        )

        redisPublisher.publish(coreEvent)

        val recorded = checkNotNull(capturedRecord)
        assertEquals("syndetis:core-events", recorded.stream)
        val eventJson = recorded.value["event"]
        assertNotNull(eventJson)
        val tree = objectMapper.readTree(eventJson)
        assertEquals("order.paid", tree.path("type").asText())
        assertEquals("c1a2b3c4-d5e6-4f70-8a9b-0c1d2e3f4a5b", tree.path("id").asText())
        assertEquals("149.90", tree.path("data").path("total").asText())
        assertEquals("ana@example.com", tree.path("data").path("customer").path("email").asText())
    }
}
