package com.syndetis.core.model.dto.layout

import tools.jackson.databind.JsonNode

data class LayoutResponse(val config: JsonNode, val version: Long)
