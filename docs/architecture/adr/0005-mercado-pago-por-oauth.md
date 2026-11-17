# 0005. Cada loja recebe na própria conta do Mercado Pago, conectada por OAuth

- Situação: aceita
- Data: 2026-11-16

## Contexto
Os pagamentos eram criados com um único token da plataforma (`MP_ACCESS_TOKEN`): todo o dinheiro caía na conta
da Syndetis. Pedir a cada lojista que copie uma chave de API do painel do Mercado Pago é difícil para quem não é
técnico e espalha credenciais por canais inseguros.

## Decisão
A Syndetis registra uma aplicação no Mercado Pago (`MP_CLIENT_ID`, `MP_CLIENT_SECRET`) e usa o OAuth para
plataformas. No painel, o lojista clica em "Conectar Mercado Pago", autoriza na página do próprio Mercado Pago e
volta com a conta conectada. O fluxo usa `state` de uso único (10 minutos, só o hash fica no banco) e PKCE S256.
O core-service guarda o token da loja cifrado (AES-256-GCM, `PAYMENT_TOKEN_KEY`) e o renova antes de vencer; o
integration-hub cria cada preferência com o token da loja. A notificação de pagamento leva o pedido no endereço,
e o core-service confere o pagamento com o token certo.

## Consequências
- O lojista nunca vê nem copia uma chave; o dinheiro de cada venda cai direto na conta dele.
- Lojas que ainda não conectaram continuam usando a conta da plataforma, como antes.
- A plataforma passa a guardar segredos de terceiros: a chave de cifra é obrigatória fora do ambiente local.
- O Mercado Pago só notifica endereços HTTPS públicos; testes locais do fluxo completo precisam de um túnel.
- Detalhes: [Mercado Pago](../../integrations/mercado-pago.md).
