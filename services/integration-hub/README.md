# Syndetis Integration Hub

NestJS/TypeScript com Redis Streams e filas BullMQ para integrações externas.

```sh
npm ci
npm test
npm run test:e2e
npm run lint
npm run build
npm run start:prod
```

Use Node 22.12+. Variáveis aceitas e validações estão em `src/config/env.validation.ts`. A saúde é exposta em `/health`; a documentação local, em `/docs`.

## Pagamento

`PaymentsModule` depende de `PaymentProvider`; a implementação atual é `MercadoPagoProvider`, responsável somente pelo contrato externo. O core controla propriedade do pedido, valor, estoque e estado financeiro.

- `POST /internal/payments/checkouts`: cria uma preferência. Exige `X-Internal-Token`; não é exposto pelo gateway.
- `GET /internal/payments/orders/:orderId`: consulta pagamentos pela referência. Exige a mesma credencial interna.
- `POST /payments/webhook`: valida a assinatura Mercado Pago e enfileira o identificador. O worker consulta o provedor e notifica o core com repetição/backoff.

Configure `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `PAYMENTS_INTERNAL_TOKEN`, `MP_SANDBOX`, `PUBLIC_ORIGIN` e `CORE_SERVICE_URL`. O checkout exige origem pública HTTPS. Segredos nunca devem estar no frontend.

O provedor valida a resposta externa e a origem HTTPS da URL de pagamento. A API de consulta do Mercado Pago é a fonte do status; parâmetros de retorno e o corpo do webhook não são usados como confirmação financeira.

## Demais integrações

Frete ainda usa um provedor simulado. E-mail e WhatsApp usam provedores de log; os webhooks genéricos possuem um processador simulado. Esses módulos não contratam transporte nem enviam notificações reais. O checkout desta entrega usa as condições de entrega definidas pelo próprio vendedor.

Veja [homologação](../../docs/homologacao.md) para configuração, limitações e jornada de aceitação.
