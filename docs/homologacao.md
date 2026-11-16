# Homologação — 0.1.0-homologation.1

URL pública definida: **https://syndetis-web.com**.

Esta entrega integra gateway, autenticação, painel de lojista, vitrine, carrinho, endereço, pedidos e Checkout Pro do Mercado Pago. A entrega dos produtos é responsabilidade do vendedor: ele define um valor fixo e instruções na loja. Não há cotação, etiqueta ou contratação de Correios pela plataforma.

## Configuração no servidor

Use Docker Engine e Compose 2.24.4 ou superior em um servidor Linux. Aponte o registro DNS A de `syndetis-web.com` para o IPv4 público estável do servidor. Publique somente TCP 80/443; o acesso administrativo deve ter origem restrita.

```sh
cp .env.homologation.example .env.homologation
```

Preencha o arquivo diretamente no servidor, sem enviar segredos ao Git ou ao chat:

- `POSTGRES_PASSWORD`: senha exclusiva de pelo menos 16 caracteres.
- `HOMOLOGATION_SELLER_PASSWORD`: senha exclusiva de pelo menos 12 caracteres. O perfil `homologation` cria esse lojista somente se o e-mail não existir; não promove contas existentes nem redefine senhas a cada reinício.
- `PAYMENTS_INTERNAL_TOKEN`: segredo aleatório de pelo menos 32 caracteres, compartilhado somente por core e integration-hub.
- `MP_ACCESS_TOKEN`: credencial da aplicação do **vendedor de teste** Mercado Pago. O comprador deve ser outra conta de teste.
- `MP_WEBHOOK_SECRET`: assinatura secreta obtida na configuração de Webhooks da aplicação.

Um segredo interno pode ser gerado localmente com `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` e colocado no arquivo de ambiente. Não reutilize a senha do banco.

Mantenha `MP_SANDBOX=true`, `AUTH_SPRING_PROFILES_ACTIVE=homologation`, `PUBLIC_ORIGIN=https://syndetis-web.com` e o mesmo valor em `JWT_ISSUER`.

```sh
node --env-file=.env.homologation scripts/validate-homologation.mjs
docker compose --env-file .env.homologation -f docker-compose.yml -f compose.homologation.yml config --quiet
docker compose --env-file .env.homologation -f docker-compose.yml -f compose.homologation.yml up -d --build
```

O primeiro comando requer Node 22+. Como alternativa, execute-o em um container Node com o arquivo de ambiente. O Caddy obtém e renova o certificado HTTPS automaticamente após o DNS apontar para o servidor. PostgreSQL, Redis e as APIs internas não publicam portas nessa composição.

Use sempre os mesmos arquivos, diretório e `COMPOSE_PROJECT_NAME` para preservar os volumes. Faça backup do PostgreSQL e do volume de chaves RSA antes de atualizar uma instalação com dados. Redis usa AOF para preservar filas após reinício.

## Mercado Pago

Configure o tópico **payment** em Webhooks:

```text
https://syndetis-web.com/api/payments/webhooks/mercadopago
```

O hub valida `x-signature`, `x-request-id`, `data.id` e timestamp, enfileira a notificação e consulta o pagamento na API do Mercado Pago. O core confere pedido, total, moeda e `live_mode` antes de baixar estoque e marcar `PAID`. Retornos do navegador como `collection_status=approved` não confirmam pagamentos.

No ambiente de testes, notificações podem não ser enviadas automaticamente pelo provedor. A página do pedido permite **Atualizar situação**, que consulta os pagamentos pela referência do pedido no servidor. A mesma sincronização ocorre no retorno com `payment_id`; esse parâmetro apenas dispara a consulta, não é aceito como comprovação.

As preferências expiram junto com a reserva de estoque. Meios de pagamento com liquidação demorada são restringidos nesta primeira versão. Aprovações tardias, valores divergentes, pagamentos duplicados e notificações de estorno/chargeback deixam o pedido sinalizado para conciliação. Não há estorno automático nesta entrega; pedidos pagos não podem ser simplesmente cancelados pelo painel sem tratamento financeiro.

Nesta homologação há uma única credencial central de vendedor de teste. **Antes da operação real com vários lojistas**, implemente conexão OAuth das contas Mercado Pago e vinculação de recebimentos por vendedor, além do fluxo de estorno e conciliação. Não use esta configuração para receber valores reais de diferentes lojas.

Referências oficiais: [preferências](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro-preferences/create-preference/post), [notificações](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications), [compras de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/integration-test/test-purchases).

## Jornada de aceitação

1. Entre com o lojista configurado no ambiente e abra **Minha loja**.
2. Crie uma loja, defina valor/instruções de entrega, cadastre um produto e adicione estoque.
3. Publique o título/cor da vitrine e compartilhe `/lojas/<slug>`.
4. Em outra sessão de navegador, cadastre o comprador, abra a vitrine e monte o carrinho.
5. Cadastre nome, telefone e endereço; revise o pedido. Endereço, contato, instruções e frete ficam copiados no pedido.
6. Abra **Pagar com Mercado Pago** e conclua a compra com a conta/cartão de teste.
7. Confirme a transição para **Pagamento confirmado**, inclusive pelo botão de atualização se necessário.
8. No painel do vendedor, confirme envio e entrega. Teste separadamente cancelamento antes do pagamento e expiração da reserva.

O access token de curta duração fica no `sessionStorage` da aba; o refresh token fica somente em memória. Após recarregar uma aba e expirar o access token, será necessário entrar novamente. Nenhuma credencial do Mercado Pago é enviada ao navegador.

## Validação automatizada

- `gateway`: `npm ci && npm test` — proxy HTTP, JWKS, tokens inválidos, isolamento de rotas e assinatura preservada.
- `frontend`: `npm ci && npm run lint && npm run build`, depois `npx playwright install chromium && npm run test:e2e` — jornadas do navegador com APIs controladas de teste.
- `services/integration-hub`: `npm ci && npm test && npm run test:e2e && npm run lint && npm run build` — contratos do provedor, HMAC e autenticação.
- `services/core-service`: JDK 21 e `./mvnw test` — PostgreSQL temporário via Testcontainers, migrations, isolamento e pagamentos idempotentes.
- `services/auth-service`: JDK 21 e `./mvnw test`.

O CI também sobe todos os serviços em um projeto Compose isolado e executa `node scripts/smoke-checkout.mjs`. O script valida APIs reais através do gateway, total calculado no servidor, repetição concorrente e liberação de estoque. Ele **não simula aprovação do Mercado Pago nem faz cobrança externa**. A compra no provedor precisa ser validada com a aplicação de testes configurada.

## Atualização e reversão

Consulte `VERSION` e o commit da instalação antes de atualizar. Não faça deploy de alterações locais sem commit. As migrations antigas permanecem imutáveis; esta entrega adiciona `V6__checkout_delivery_and_payments.sql`. Ela somente acrescenta colunas/tabela, mantendo compatibilidade de armazenamento com a versão anterior. Uma reversão do código deve ser testada com backup restaurado antes de operar sobre dados reais.

Esta entrega não publica automaticamente o domínio nem substitui a validação da infraestrutura. A publicação depende de acesso ao servidor, DNS e credenciais de teste.
