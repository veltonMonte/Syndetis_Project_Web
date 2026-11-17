# Visão geral da arquitetura

A Syndetis é um monorepo com microsserviços poliglotas atrás de um único gateway. O navegador só conversa com
o gateway; cada serviço tem o próprio banco.

```text
Navegador (SPA React)
        │  HTTPS
        ▼
     Gateway (Node) ── valida o JWT localmente (JWKS), limita requisições, encaminha
        │
        ├──► auth-service (Kotlin)      contas, login, JWT RS256, Google/GitHub, CNPJ dos lojistas
        │        └── Postgres syndetis_auth
        ├──► core-service (Kotlin)      lojas, catálogo, estoque, pedidos, layout do Maker, contas de recebimento
        │        └── Postgres syndetis_core
        └──► integration-hub (Node)     Mercado Pago, Receita Federal, Asaas, e-mail, frete
                 └── Redis (filas BullMQ e eventos do core)
```

## Quem faz o quê

| Regra | Onde vive | Por quê |
|---|---|---|
| Quem pode entrar e com qual papel | auth-service | Emite o token; o papel nunca vem do cliente |
| Só lojista com CNPJ ativo cria conta e loja | auth-service (cadastro) e core-service (abrir loja) | [ADR 0004](adr/0004-documento-do-lojista-na-receita.md), [ADR 0006](adr/0006-lojista-somente-cnpj.md) |
| Preço, estoque e total do pedido | core-service | O servidor recalcula tudo; o navegador só sugere |
| Aparência da loja | `layout_config` (JSONB) no core-service | [ADR 0002](adr/0002-layout-como-json.md) |
| Falar com provedores externos | integration-hub | Isola credenciais, retentativas e formatos de terceiros |
| Para onde vai o dinheiro de uma venda | core-service (token da loja) + integration-hub | [ADR 0005](adr/0005-mercado-pago-por-oauth.md) |

## Comunicação entre serviços

- **Navegador → serviços:** sempre pelo gateway, que confere o JWT com a chave pública do auth-service
  (`/.well-known/jwks.json`) sem chamá-lo a cada requisição ([ADR 0001](adr/0001-jwt-validado-localmente.md)).
- **Serviço → integration-hub:** HTTP interno com um segredo compartilhado no cabeçalho `X-Internal-Token`
  (`PAYMENTS_INTERNAL_TOKEN`, `TAX_ID_INTERNAL_TOKEN`, `BILLING_INTERNAL_TOKEN`). As rotas `/internal/*` não
  passam pelo gateway.
- **Provedores → plataforma:** webhooks assinados (Mercado Pago, Asaas) entram pelo gateway e viram trabalhos
  em fila no integration-hub.
- **core-service → integration-hub:** eventos de domínio (pedido criado, pago…) num stream do Redis.

## Uma compra, do começo ao fim

1. O comprador monta a sacola na vitrine; o core-service reserva o estoque e cria o pedido `PENDING`.
2. O core-service pede ao integration-hub uma preferência do Mercado Pago, com o token da loja quando ela
   conectou a própria conta.
3. O comprador paga no Mercado Pago. A notificação assinada chega ao gateway, vai para a fila do
   integration-hub e faz o core-service conferir o pagamento com o mesmo token.
4. Valor, moeda e ambiente conferem: o pedido vira `PAID` e o estoque reservado é baixado. Qualquer
   divergência marca o pedido para revisão em vez de aprová-lo.

## Ambientes

| Ambiente | Como sobe | Banco |
|---|---|---|
| Local | `docker compose up -d` | Postgres do Compose, ou a branch de teste do Neon |
| Kubernetes local | `node scripts/kubernetes/local.mjs` | Postgres no cluster |
| Homologação | `docker-compose.yml` + `compose.homologation.yml` (sobreposição) | Postgres do Compose, sem porta exposta |
| Produção | `compose.aws.yml` em EC2 | Neon, branch `production` |
