package com.syndetis.auth.model.dto

import jakarta.validation.constraints.NotBlank

data class OAuthCodeRequest(@field:NotBlank val code: String)
