package com.syndetis.core.event

/**
 * Interface para publicação de eventos externos do ecossistema Syndetis.
 */
interface CoreEventPublisher {
    fun publish(event: CoreEvent)
}
