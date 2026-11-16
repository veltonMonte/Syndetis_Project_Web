# Core service — e-commerce

O `core-service` atende apenas lojas virtuais nesta primeira entrega. Cardápios e eventos ficam fora do modelo e das rotas atuais.

## Entregas

| Fase | Branch | Conteúdo |
|---|---|---|
| 0 | `codex/feat-core-setup` | Maven, Boot 4.1, Postgres, Flyway, saúde, OpenAPI e CI |
| 1 | `codex/feat-core-security` | RS256 via JWKS, `iss`/`aud`, roles e CORS |
| 2 | `codex/feat-core-stores` | Lojas, rascunho/publicação do Maker, ETag |
| 3 | `codex/feat-core-catalog` | Categorias, produtos, busca e paginação |
| 4 | `codex/feat-core-inventory` | Estoque, auditoria, lock pessimista |
| 5 | `codex/feat-core-customers` | Perfil de cliente e endereços privados |
| 6 | `codex/feat-core-orders` | Pedidos, idempotência, reservas e expiração |
| 7 | `codex/feat-core-deploy` | Imagem Docker e Compose |

As branches são empilhadas nesta ordem. Cada uma tem um commit próprio e deve ser revisada na sequência; após o merge de uma fase na `dev`, a seguinte pode ser redirecionada para `dev`.

## Decisões

- Build Maven, como o `auth-service` atual. Java 21 e Kotlin 2.3.21.
- Banco `syndetis_core`, separado do `auth-service`. Migrations `V1` a `V5` são imutáveis depois de aplicadas.
- O core só valida access tokens RS256 pelo JWKS do auth-service. Não armazena chave privada nem emite tokens.
- O `sub` é UUID; `role` é `CUSTOMER`, `SELLER` ou `ADMIN`; `iss` e `aud` são verificados.
- Todas as rotas de lojista conferem a posse da loja na camada de serviço. Endereços e pedidos de cliente são consultados pelo usuário autenticado.
- O Maker mantém `draft` e `published` em JSONB. Escrita exige `If-Match`; a vitrine recebe apenas `published`.
- Reserva, pagamento, cancelamento e expiração são transações com bloqueio de linha no estoque. Pedidos com múltiplos itens bloqueiam produtos ordenados por UUID.
- `Idempotency-Key` é obrigatória para criar pedidos; uma trava transacional do PostgreSQL serializa tentativas simultâneas da mesma chave.
- O preço é copiado do produto no servidor. Pagamento é confirmado manualmente pelo lojista; integração real de pagamentos não faz parte desta fase.

## Execução local

1. Use JDK 21 e suba o PostgreSQL: `docker compose up -d postgres`.
2. Configure o auth-service com RS256/JWKS e inicie-o na porta 8081.
3. Em `services/core-service`, execute `./mvnw spring-boot:run` (`.\mvnw.cmd spring-boot:run` no PowerShell).
4. Consulte `http://localhost:8082/actuator/health` e `http://localhost:8082/swagger-ui.html`.

O Compose também pode construir o core: `docker compose up -d --build core-service`. Nesse caso ele acessa o auth-service no host por `host.docker.internal:8081`.

## Testes

`./mvnw test` executa testes unitários e integração com PostgreSQL 16 em Testcontainers. O job `Core Service (Build & Test)` do CI executa o mesmo comando. É preciso Docker disponível para os testes de integração.

## Próximas integrações

- API Gateway e frontend consumindo o contrato publicado.
- Provedor de pagamentos; somente após isso `PAID` deve refletir pagamento confirmado externamente.
- Frete e notificações por eventos/outbox, sem chamada síncrona na transação de pedido.
