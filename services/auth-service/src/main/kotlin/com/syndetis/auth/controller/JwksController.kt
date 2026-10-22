package com.syndetis.auth.controller

import com.nimbusds.jose.jwk.JWKSet
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class JwksController(private val jwkSet: JWKSet) {

    @GetMapping("/.well-known/jwks.json")
    fun keys(): Map<String, Any> {
        // toPublicJWKSet() garante que apenas parâmetros públicos (kty, kid, n, e, use, alg)
        // sejam expostos e que parâmetros privados (d, p, q, dp, dq, qi) sejam eliminados.
        return jwkSet.toPublicJWKSet().toJSONObject()
    }
}
