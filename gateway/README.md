# Syndetis Gateway

Gateway HTTP em TypeScript/Express. Valida access tokens RS256 por JWKS localmente, com cache; os serviços mantêm as verificações de permissão e posse dos recursos.

| Caminho público | Destino |
| --- | --- |
| `/api/auth/*`, OAuth2 e JWKS | auth-service |
| `/api/core/*` | core-service (`/api/*`) |
| `/api/integrations/shipping/quotes` | integration-hub (`/shipping/quotes`) |
| `/api/payments/webhooks/mercadopago` | integration-hub (`/payments/webhook`) |
| `/` e rotas da SPA | frontend |

As rotas são explícitas. Endpoints `/internal`, Actuator e Swagger não ficam expostos pelo gateway. O webhook Mercado Pago mantém os cabeçalhos usados na assinatura. Cabeçalhos de identidade e a credencial interna fornecidos por clientes são removidos.

```sh
npm ci
npm test
npm run dev
```

Node 22.12+ é obrigatório. Configuração em `src/config.ts`: `GATEWAY_PORT`, `PUBLIC_ORIGIN`, `AUTH_SERVICE_URL`, `CORE_SERVICE_URL`, `INTEGRATION_HUB_URL`, `FRONTEND_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`, `PROXY_TIMEOUT_MS`, `AUTH_RATE_LIMIT`, `TRUSTED_PROXY_HOPS`. URLs de destino aceitam apenas origens HTTP(S), sem credenciais ou caminhos.

O gateway recebe no máximo 2 MiB por requisição (16 KiB em `/api/auth/*`),
com prazo total de 15 segundos para o corpo. Conta bytes inclusive em uploads
chunked e só encaminha o corpo completo validado, preservando seus bytes para
assinaturas de webhook. Corpos comprimidos são rejeitados com 415. O Caddy
também limita o corpo a 2 MiB e aplica timeouts de leitura. Uploads de arquivos
maiores deverão usar um fluxo específico, sem aumentar indiscriminadamente
esses limites das APIs.

Por padrão, serviços estão em localhost nas portas 8081, 8082, 3001 e 5173. Para desenvolvimento com Vite em 5173, configure `PUBLIC_ORIGIN=http://localhost:5173` e permita essa origem no core. A composição Docker serve a SPA pelo gateway em 8080.

O limitador de login/cadastro é por IP, em memória, apropriado para uma instância de homologação. Múltiplas réplicas exigem um armazenamento compartilhado para esse limite.

Veja [homologação](../docs/homologacao.md) para HTTPS e configuração do domínio.
