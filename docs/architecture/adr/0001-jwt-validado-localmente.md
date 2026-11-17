# 0001. Validar o JWT localmente com JWKS

- Situação: aceita
- Data: 2026-11-16 (registro de uma decisão anterior, descrita no AGENTS.md)

## Contexto
Toda requisição autenticada passa pelo gateway e por um serviço. Perguntar ao auth-service se cada token é
válido acoplaria todos os serviços a ele e somaria uma chamada de rede a cada requisição.

## Decisão
O auth-service assina tokens de acesso curtos (5 a 15 minutos) com RS256 e publica a chave pública em
`/.well-known/jwks.json`. Gateway, core-service e integration-hub validam assinatura, `iss`, `aud` e validade
localmente, com a chave em cache. O refresh token é opaco, guardado com hash no banco do auth-service e trocado
a cada uso, o que permite revogar sessões de verdade.

## Consequências
- O auth-service pode ficar fora do ar por instantes sem derrubar requisições já autenticadas.
- Um papel ou uma permissão retirada só vale quando o token atual expira; por isso ele é curto.
- Dados que mudam o que a pessoa pode fazer viajam como claims, como `doc_verified` ([ADR 0004](0004-documento-do-lojista-na-receita.md)).
- Trocar a chave exige publicar a anterior por um tempo (`JWT_RSA_PREVIOUS_*`).
