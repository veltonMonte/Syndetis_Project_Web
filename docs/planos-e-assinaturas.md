# Planos e assinaturas — proposta para testes

Os valores abaixo foram aceitos para testes em 27/10/2026. São provisórios e
serão revisados pelos responsáveis pelo Syndetis antes da definição comercial.

| Plano | Mensalidade | Proposta de valor |
| --- | --- | --- |
| Standard | R$ 29,90 | Loja com layout predefinido e personalização básica. |
| Maker | R$ 69,90 | Maior liberdade visual, elementos adicionais e agente de IA para criar e ajustar layouts. |

O catálogo inicial fica em
`services/core-service/src/main/resources/billing/plans.json`. Os preços são
representados em centavos inteiros, na moeda BRL, para evitar arredondamentos.
Os identificadores `STANDARD` e `MAKER` devem permanecer estáveis mesmo se os
nomes ou os preços forem alterados.

## Situação da implementação

O core consome o catálogo para determinar o preço das assinaturas. O fluxo
de cobranças Asaas no Sandbox é habilitado por `BILLING_ENABLED`; consulte
[a configuração e jornada de testes](assinaturas-asaas.md). O agente de IA
e o editor visual ampliado ainda são entregas separadas.

## Regras iniciais para testes

- Assinatura por loja, sem teste gratuito nem tolerância após o período pago.
- Cancelamento da renovação preserva o período pago e os dados da loja.
- Mudança de plano após cancelamento e término do período pago; sem rateio.

Essas escolhas são provisórias e não substituem a decisão comercial final.

## Regras a revisar antes de cobrar em produção

- Se a assinatura cobre uma loja ou a conta do lojista.
- Limites de produtos, armazenamento e ações de IA por ciclo. Os números
  sugeridos na discussão (100/500 produtos e 20 ações de IA) ainda precisam de
  validação de custo e decisão comercial; não são limites implementados.
- Existência de teste gratuito, sua duração e se haverá cobrança automática.
- Prazo de tolerância, suspensão, reativação e tratamento dos pedidos existentes.
- Upgrade, downgrade e cancelamento, incluindo o tratamento de layouts e
  catálogos que ultrapassem os limites do novo plano.

## Implementação e próximos passos

O fluxo implementa catálogo, persistência em migration nova, integração pelo
hub, webhook autenticado, conciliação, validade e endpoints de assinaturas.
As permissões de publicação e novas compras são verificadas no backend.
O frontend permanece sem alterações. Ainda é necessário integrar a interface,
entregar o editor ampliado/agente de IA, fechar limites
comerciais e homologar a jornada com a conta Sandbox antes de habilitar produção.

A mensalidade paga pelo lojista ao Syndetis e o pagamento das compras feitas
na loja são fluxos distintos. Este catálogo trata somente da mensalidade.
