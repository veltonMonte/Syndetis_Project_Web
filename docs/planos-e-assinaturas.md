# Planos e regras de assinatura

Regras confirmadas em 29/10/2026, aplicadas no core-service por loja.

| Recurso | Standard — R$ 29/mês | Maker — R$ 49/mês |
| --- | --- | --- |
| Produtos ativos | 100 | 500 |
| Textos, fontes, cores, logo e imagens dos templates | Sim | Sim |
| Mover, remover e configurar componentes | Não | Sim |
| IA para layout e imagens | Não | 30 requisições diárias compartilhadas |

O catálogo é `services/core-service/src/main/resources/billing/plans.json`.
Os preços são inteiros em centavos, BRL, com IDs estáveis `STANDARD` e `MAKER`.
O backend determina preço e permissões; valores ou capacidades enviados pelo
frontend não concedem acesso. Assinaturas existentes mantêm o preço contratado
registrado em `store_subscriptions.price`; a alteração do catálogo vale para
novas assinaturas e não reescreve cobranças anteriores.

## Vigência e troca de plano

- Uma assinatura por loja, sem teste gratuito ou tolerância após o período pago.
- Somente o período pago vigente concede recursos do plano contratado.
  Assinatura Maker pendente ou expirada não concede edição estrutural nem IA.
  Sem período pago, o lojista pode preparar conteúdo com as regras Standard,
  mas não publicar ou receber novas compras.
- Cancelar a renovação preserva o período já pago e todos os dados da loja.
- A troca de plano continua disponível após cancelamento e término do período
  pago, sem rateio. Upgrade imediato com rateio não faz parte desta entrega.

## Produtos e downgrade

O limite conta produtos **ativos**. Desativar/excluir um produto pela API libera
uma vaga; o registro continua preservado. Criar um produto ativo e reativar um
inativo exigem vaga. Atualizar um produto já ativo e desativar produtos continuam
permitidos mesmo acima do limite após downgrade. A verificação e a alteração
ocorrem na mesma transação, com bloqueio da loja, incluindo chamadas concorrentes.

Ao passar de Maker para Standard:

1. Produtos, estoque, pedidos, rascunho e versão publicada não são apagados.
2. Novos produtos ativos e reativações ficam bloqueados enquanto não houver vaga.
3. A republicação exige no máximo 100 produtos ativos e um layout compatível
   com um template Standard. O lojista pode salvar um rascunho adequado antes
   de terminar de reduzir o catálogo.
4. A versão pública já publicada é preservada. Sua disponibilidade continua
   sujeita à vigência paga da assinatura; não há conversão automática do layout.

## Templates e Maker

Os templates aceitos pelo core são definidos no servidor. Atualmente o template
registrado é `ecommerce`, em `src/main/resources/layout-templates/ecommerce.json`.
`templateId` pode ser omitido em layouts antigos e assume `ecommerce`.
Os modelos visuais do protótipo frontend ainda precisam ser registrados e
integrados a esse contrato; seus IDs não são aceitos automaticamente pelo core.

No Standard, a sequência e os tipos das seções devem corresponder ao template.
É permitido preencher os campos de conteúdo previstos para cada seção e alterar
cores/fontes/logo no `theme`, inclusive no `theme` de cada seção. Propriedades
estruturais, objetos arbitrários, CSS e templates inventados são rejeitados.
A comparação usa o template do servidor, nunca uma estrutura enviada pelo cliente.

No Maker, a estrutura pode ser alterada dentro do schema de layout existente:
seções `hero`, `product-grid`, `banner`, `text` e `footer`, com ao menos uma seção.
Permanecem a validação de URLs/cores, o limite de tamanho e o controle de versão
por `If-Match`. A autorização é conferida tanto ao salvar como ao publicar,
impedindo republicar um rascunho premium antigo depois do downgrade.

## Cota diária de IA

A infraestrutura de cota está implementada em `AiQuotaService`, com persistência
na migration nova `V8__ai_daily_quota.sql`. **O provedor de IA e os endpoints de
geração/edição ainda não estão integrados.** A cota permite preparar essa etapa
sem disponibilizar um endpoint público para debitar ou devolver uso.

- 30 requisições por loja/dia, compartilhadas por `LAYOUT_EDIT` e `IMAGE_GENERATION`.
- Virada à meia-noite em `America/Sao_Paulo`; não há acúmulo para o dia seguinte.
- A contagem pertence à loja e ao dia, não à assinatura: trocar ou renovar plano
  não reabastece a cota do mesmo dia.
- `reserve(storeId, requestId, operation)` exige proprietário/admin e Maker pago,
  confirma a reserva em transação própria antes da chamada externa e serializa
  reservas concorrentes por loja. UUIDs de requisição são idempotentes.
- Somente o retorno com `acquired=true` autoriza iniciar uma nova chamada ao
  provedor. Repetições retornam `acquired=false` e o estado existente; reutilizar
  o UUID para outra operação é rejeitado. O futuro adaptador deve também enviar
  esse UUID como chave de idempotência quando suportado pelo provedor.
- `complete` confirma consumo e é idempotente. `fail` libera a vaga apenas para
  trabalho não concluído, também de forma idempotente. Trabalho concluído não
  pode ser devolvido como falha.
- Reservas têm validade de 15 minutos para conclusão. Uma reserva expirada com
  resultado externo desconhecido **continua contando naquele dia**, evitando
  chamadas cobradas acima da cota. O futuro executor deve usar timeout menor que
  essa validade e reconciliar falhas confirmadas antes de liberar vagas.
- Reservas falhas/expiradas não são reiniciadas com o mesmo UUID. A repetição de
  uma requisição concluída não dispara outra geração nem consome outra vaga.

## Consulta para a interface

- `GET /api/public/plans`: preços, limites e recursos dos planos.
- `GET /api/stores/{storeId}/entitlements`: plano efetivo, vigência, capacidades,
  produtos usados/restantes, cota de IA, próxima virada, templates disponíveis,
  `layoutAdaptationRequired` e `canRepublish`. Acesso exige proprietário/admin.
- Pelo gateway, use o prefixo `/api/core`, como nos demais endpoints do core.

`canRepublish` informa a adequação ao plano e a vigência; a gravação/publicação
continua sujeita às demais validações e à versão atual do layout.

## Modo local e validação

Com `BILLING_ENABLED=true`, os limites e as permissões são obrigatórios.
Com `BILLING_ENABLED=false`, permanece o bypass explícito de desenvolvimento:
edição estrutural e catálogo sem bloqueio por plano, com `enforced=false` na
consulta. Esse modo não concede chamadas de IA pagas (`ai.limit=0`).
Não usar o bypass para operar assinaturas em produção.

Os testes de integração com PostgreSQL/Testcontainers cobrem limites 100/500,
concorrência, reativação, permissões de layout, isolamento entre lojistas,
vigência, downgrade, idempotência de IA e virada diária em São Paulo.
No diretório `services/core-service`, com JDK 21 e Docker disponíveis:

```powershell
./mvnw.cmd '-Dkotlin.compiler.daemon=false' test
```

Consulte [a jornada Asaas Sandbox](assinaturas-asaas.md) para homologar cobranças.
A assinatura paga pelo lojista ao Syndetis e o pagamento das compras na loja
continuam sendo fluxos distintos. A interface de planos, o editor ampliado,
o provedor de IA, promoções e novos detalhes de criação da loja são etapas seguintes.
