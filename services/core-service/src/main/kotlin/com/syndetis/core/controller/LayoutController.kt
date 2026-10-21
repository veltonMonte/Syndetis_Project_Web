package com.syndetis.core.controller

import com.syndetis.core.model.dto.layout.LayoutResponse
import com.syndetis.core.service.LayoutService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import tools.jackson.databind.JsonNode
import java.util.UUID

@RestController
@RequestMapping("/api/stores/{storeId}/layout")
class LayoutController(private val layouts: LayoutService) {
    @GetMapping
    fun get(@PathVariable storeId: UUID): ResponseEntity<LayoutResponse> = response(layouts.get(storeId))

    @PutMapping
    fun update(
        @PathVariable storeId: UUID,
        @RequestHeader("If-Match") ifMatch: String,
        @RequestBody draft: JsonNode,
    ): ResponseEntity<LayoutResponse> = response(layouts.update(storeId, layouts.parseVersion(ifMatch), draft))

    @PostMapping("/publish")
    fun publish(
        @PathVariable storeId: UUID,
        @RequestHeader("If-Match") ifMatch: String,
    ): ResponseEntity<LayoutResponse> = response(layouts.publish(storeId, layouts.parseVersion(ifMatch)))

    private fun response(layout: LayoutResponse): ResponseEntity<LayoutResponse> =
        ResponseEntity.ok().eTag("\"${layout.version}\"").body(layout)
}
