# Assinaturas Asaas — Sandbox

Branch de desenvolvimento: `codex/feat-asaas-subscriptions`.

## Comportamento desta entrega

- Assinatura mensal por loja: Standard R$ 29,90 e Maker R$ 69,90.
- O catálogo `services/core-service/src/main/resources/billing/plans.json` é
  lido pelo core e exposto em `GET /api/core/public/plans`. O cliente envia o
  identificador do plano; o servidor determina o valor. O preço contratado
  fica preservado na assinatura, mesmo se o catálogo mudar.
- Sem teste gratuito e sem tolerância após o período pago. Essas escolhas
  iniciais podem ser revistas antes da operação comercial.
- O lojista pode preparar catálogo e layout antes de pagar. Vitrine,
  catálogo público, publicação do layout e criação de novos pedidos exigem
  período pago quando `BILLING_ENABLED=true`.
- O painel e os pedidos anteriores continuam acessíveis ao proprietário.
  O pagamento de um pedido já criado também continua disponível, para não
  interromper a jornada de um comprador por causa da assinatura do vendedor.
- Os pagamentos das compras continuam no Mercado Pago. Asaas recebe somente
  a mensalidade da plataforma, sem split ou subcontas nesta entrega.
- O plano Maker registra a oferta proposta; o agente de IA e o editor visual
  ampliado ainda são entregas separadas.
- A implementação é exclusivamente de backend. O frontend não foi alterado;
  as rotas abaixo estão disponíveis para a futura integração da interface.
- Não há upgrade/downgrade com rateio: cancele a renovação, aguarde o período
  contratado terminar e escolha o novo plano. Não há exclusão de dados.

## Configuração local

O `.env` da raiz é carregado pelo Docker Compose. Configure:

```dotenv
BILLING_ENABLED=true
ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3
ASAAS_API_KEY='chave_da_conta_sandbox'
BILLING_INTERNAL_TOKEN='segredo_aleatorio_exclusivo_de_pelo_menos_32_caracteres'
ASAAS_WEBHOOK_TOKEN='outro_segredo_aleatorio_de_32_a_255_caracteres_sem_espacos'
```

Os dois tokens devem ser distintos. O token do webhook não é a chave de API.
As aspas simples preservam os caracteres `$` da chave ao carregar o Compose.
Nunca use prefixo `VITE_` para segredos. Não envie chaves ao chat nem ao Git.

Nesta entrega o hub rejeita a URL da API de produção. Somente dados e
pagamentos de teste devem ser usados. Não é feita qualquer chamada ao Asaas
durante o build ou testes automatizados.

```sh
docker compose up -d --build
```

A migration `V7__store_subscriptions.sql` é aplicada automaticamente no core.
Habilitar a cobrança suspende a vitrine de lojas sem período pago, inclusive
lojas já existentes; não execute essa mudança sobre uma instalação em uso sem
planejar a transição.

Para executar o hub fora do Docker, configure as mesmas variáveis no ambiente
do processo ou no `.env` de `services/integration-hub`. A execução nessa pasta
não carrega automaticamente o `.env` da raiz. O core precisa de
`BILLING_ENABLED`, `BILLING_INTERNAL_TOKEN` e da URL do hub no seu ambiente.

## Webhook no Asaas

No Sandbox, abra **Menu do usuário → Integrações → Webhooks** e cadastre:

```text
https://SEU_DOMINIO/api/billing/webhooks/asaas
```

Utilize uma URL HTTPS pública apontando ao gateway. Para desenvolvimento,
um túnel HTTPS pode encaminhar ao gateway local na porta 8080. Não aponte o
webhook diretamente ao core ou exponha endpoints internos.

No campo de autenticação (`authToken`), informe o valor de
`ASAAS_WEBHOOK_TOKEN`. Selecione os eventos de cobranças `PAYMENT_*` e de
assinaturas `SUBSCRIPTION_*` disponíveis. Configure o fluxo sequencial para
facilitar o acompanhamento; o backend também lida com duplicatas e snapshots
antigos. O token chega no cabeçalho `asaas-access-token`.

O hub autentica o evento, persiste os identificadores em BullMQ e só então
responde HTTP 200. O worker consulta o estado atual no Asaas, sem confiar em
valor/status enviados no webhook, e encaminha um snapshot ao core autenticado
com `BILLING_INTERNAL_TOKEN`. Falhas têm repetição/backoff e ficam retidas na
fila para inspeção. Eventos fora de ordem não substituem snapshots mais novos.

## Contrato para testar pelo gateway

Todas as rotas de loja exigem `Authorization: Bearer <access-token>` de um
lojista proprietário da loja ou administrador. Não envie a chave Asaas ao
navegador ou aos endpoints públicos. Use Postman ou outro cliente de API.

| Método | Rota | Função |
| --- | --- | --- |
| GET | `/api/core/public/plans` | Catálogo e indicador de habilitação, sem autenticação |
| GET | `/api/core/stores/{storeId}/subscription` | Situação, validade e cobranças |
| POST | `/api/core/stores/{storeId}/subscription` | Criar/retomar assinatura |
| POST | `/api/core/stores/{storeId}/subscription/sync` | Consultar o Asaas e conciliar |
| POST | `/api/core/stores/{storeId}/subscription/cancel` | Cancelar renovação |

Corpo da criação (o preço vem do servidor, não deste JSON):

```json
{
  "planId": "STANDARD",
  "name": "Lojista Teste",
  "cpfCnpj": "CPF_OU_CNPJ_FICTICIO_VALIDO_SOMENTE_NUMEROS"
}
```

Os identificadores de plano aceitos são `STANDARD` e `MAKER`. O e-mail vem
do token autenticado. As cobranças retornadas em `payments` possuem
`invoiceUrl`, que aponta à fatura hospedada no Sandbox Asaas.

## Jornada de aceitação pela API

1. Use um lojista (`SELLER` ou `ADMIN`) existente. A conta de homologação
   continua disponível; este fluxo não promove um cadastro `CUSTOMER`.
2. Crie ou selecione uma loja pelas rotas existentes e guarde seu UUID.
3. Faça POST na rota de assinatura com plano, nome e CPF/CNPJ fictícios
   válidos para Sandbox. Consulte a assinatura pela rota GET.
4. Abra a `invoiceUrl` retornada no Asaas. O checkout usa `billingType=UNDEFINED`, permitindo
   escolher os meios disponibilizados pela conta na página hospedada.
5. Confirme o pagamento pelos recursos de teste do Asaas. Aguarde o webhook
   ou faça POST na rota `/subscription/sync`.
6. Confirme que a vitrine, catálogo e publicação ficam disponíveis após a
   confirmação. Criar uma recorrência ou retornar da fatura não libera a loja.
7. Faça POST na rota `/subscription/cancel`. A geração de novas cobranças para e o período já pago
   permanece válido. No Asaas, remover a assinatura também remove cobranças
   pendentes/vencidas; cobranças pagas permanecem registradas.
8. Teste estorno e expiração: a vitrine deixa de aceitar novas compras; o
   proprietário ainda acessa painel e pedidos existentes.

O backend retorna cobranças hospedadas, não recebe números de cartão. No Pix e
boleto comuns é necessário pagar cada cobrança; isso não ativa Pix Automático.

## Consistência e recuperação

- O core grava uma solicitação antes de chamar o provedor e serializa a
  criação por loja. Se houver timeout, aguarde dois minutos e repita o mesmo
  plano; o hub procura cliente e assinatura por `externalReference` antes de
  criar. Duplicidade encontrada exige conciliação em vez de outra cobrança.
- A validade deriva dos ciclos das cobranças `CONFIRMED` ou `RECEIVED` com
  valor igual ao contratado. Eventos repetidos não acrescentam meses.
- Estorno/contestação remove a cobertura do respectivo ciclo. Cobranças
  futuras ainda não confirmadas não suspendem um período já pago.
- A rota de atualização e a conciliação periódica (até 20 assinaturas por
  rodada de 5 minutos) recuperam notificações perdidas. A checagem de validade
  acontece no backend a cada acesso público, sem depender de um job de expiração.
- Monitorar falhas retidas na fila e a fila pausada do Asaas continua sendo
  uma responsabilidade operacional. Não há painel de conciliação nesta entrega.

## Verificação

- Hub: testes de recuperação de criação, autenticação, proteção da URL da
  fatura, paginação e repetição de notificações; testes HTTP da fronteira.
- Core: política de validade e testes de integração de preço, posse da loja,
  confirmação, duplicatas, estorno, snapshot antigo e cancelamento.
- Gateway: catálogo público, assinatura autenticada e webhook sem JWT com
  preservação do token próprio; endpoints internos não são publicados.

Testes de integração do core precisam de JDK 21 e Docker/Testcontainers.
Testes automatizados usam provedores simulados; a jornada com uma conta real
do Sandbox precisa ser executada com o ambiente e o webhook configurados.

## Referências

- [Chaves e ambientes](https://docs.asaas.com/docs/chaves-de-api)
- [Criar assinatura](https://docs.asaas.com/reference/criar-nova-assinatura)
- [Cobranças da assinatura](https://docs.asaas.com/reference/listar-cobrancas-de-uma-assinatura)
- [Webhooks](https://docs.asaas.com/docs/receive-asaas-events-at-your-webhook-endpoint)
- [Cancelamento](https://docs.asaas.com/reference/remover-assinatura)
