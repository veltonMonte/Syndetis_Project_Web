# Mercado Pago

A Syndetis cobra pelo Checkout Pro do Mercado Pago. Cada loja pode receber na **própria conta**, conectada por
OAuth no painel: o lojista não precisa encontrar nem copiar chaves de API. Decisão registrada no
[ADR 0005](../architecture/adr/0005-mercado-pago-por-oauth.md).

## Para o lojista

1. Painel da loja → **Recebimentos** → **Conectar Mercado Pago**.
2. Entrar na conta do Mercado Pago e autorizar a Syndetis.
3. De volta ao painel aparece "Mercado Pago conectado", com o apelido da conta e o ambiente (testes ou produção).

Para trocar de conta, desconecte e conecte de novo. Enquanto uma loja não conectar, as vendas usam a conta da
plataforma (`MP_ACCESS_TOKEN`), como antes.

## Configurar a plataforma

1. Em [Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel/app), crie a aplicação da
   Syndetis (Checkout Pro) e ative o fluxo OAuth.
2. Cadastre a URL de redirecionamento, exatamente:
   `<PUBLIC_ORIGIN>/api/core/public/payments/mercadopago/callback`
   (local: `http://localhost:8080/api/core/public/payments/mercadopago/callback`).
3. Preencha no `.env` (nunca no código ou em issues):

| Variável | Serviço | Para quê |
|---|---|---|
| `MP_CLIENT_ID`, `MP_CLIENT_SECRET` | integration-hub | Aplicação da Syndetis no Mercado Pago |
| `PAYMENT_TOKEN_KEY` | core-service | Cifra os tokens das lojas no banco; obrigatória fora do ambiente local |
| `PAYMENTS_ENABLED=true` | core-service | Liga o checkout |
| `PAYMENTS_INTERNAL_TOKEN` | core-service e integration-hub | Segredo das chamadas internas (mínimo 32 caracteres) |
| `MP_WEBHOOK_SECRET` | integration-hub | Confere a assinatura das notificações |
| `MP_SANDBOX` | ambos | `true` usa credenciais de teste do Mercado Pago |
| `PUBLIC_ORIGIN` | ambos | Origem pública HTTPS; o Mercado Pago só notifica HTTPS |

Sem `MP_CLIENT_ID`/`MP_CLIENT_SECRET`, o painel mostra que a conexão ainda não foi ativada e o botão fica
desligado.

## Como funciona

```text
Painel ──POST /api/core/stores/{id}/payments/mercadopago/authorize──► core-service
   core-service: cria state (uso único, 10 min, só o hash é salvo) e verificador PKCE
   core-service ──► integration-hub /internal/payments/oauth/authorization-url
Navegador ──► auth.mercadopago.com (lojista autoriza)
Mercado Pago ──► GET /api/core/public/payments/mercadopago/callback?code&state
   core-service: consome o state ──► integration-hub /internal/payments/oauth/token (troca com PKCE)
   core-service: guarda access e refresh token cifrados (AES-256-GCM) e manda o navegador ao painel
```

- **Checkout:** o core-service passa o token da loja ao integration-hub, que cria a preferência com ele. A
  `notification_url` leva `?order=<id>`.
- **Notificação:** o integration-hub confere a assinatura e pede ao core-service
  (`POST /internal/payments/orders/{id}/sync`) que busque os pagamentos do pedido com o token da loja.
- **Renovação:** tokens do Mercado Pago valem cerca de 180 dias; o core-service renova 7 dias antes de vencer.
- **O que nunca acontece:** tokens em logs, na resposta das APIs ou no navegador.

## Endpoints

| Método e rota (via gateway) | Quem | Resposta |
|---|---|---|
| `GET /api/core/stores/{id}/payments/mercadopago` | dono da loja | `available`, `connected`, `nickname`, `liveMode`, `connectedAt` |
| `POST /api/core/stores/{id}/payments/mercadopago/authorize` | dono da loja | `authorizationUrl` |
| `DELETE /api/core/stores/{id}/payments/mercadopago` | dono da loja | 204 |
| `GET /api/core/public/payments/mercadopago/callback` | Mercado Pago | 303 para `/#/dashboard?mercadopago=conectado\|cancelado\|erro` |

## Dados

Tabelas do core-service criadas em `V11__store_payment_accounts.sql`: `store_payment_accounts` (uma conta por
loja, tokens cifrados) e `payment_oauth_states` (tentativas de conexão em andamento).
