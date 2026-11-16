# Syndetis Frontend

Frontend React da plataforma Syndetis: início, modelos, página Sobre, Sessão Maker, login e painel da loja.

Execute `npm ci` e `npm run dev`. Consulte [PROTOTYPE.md](./PROTOTYPE.md) para a estrutura Tailwind/shadcn/Echo UI e os componentes de dispositivos.

## Login e painel da loja

O login usa a API de autenticação. A sessão fica em `sessionStorage` nesta aba, incluindo o refresh token rotativo para sobreviver ao recarregamento. Uma sessão revogada volta ao formulário com um aviso; sair limpa a sessão imediatamente.

O painel em `/#/dashboard` consulta as lojas do usuário, pagina e filtra pedidos no servidor, mostra itens e entrega e confirma as transições pago → enviado → entregue. Pagamentos não são aprovados manualmente pelo painel. As abas de plano e conta usam os dados reais; o painel antigo com métricas e conversas de demonstração não é mais a rota ativa.

O cadastro público atual do backend cria uma conta `CUSTOMER`. O painel informa quando a gestão ainda não está habilitada. Para validar a operação de lojas, use uma conta `SELLER` ou `ADMIN` já provisionada no ambiente de testes. A habilitação pública de lojista é uma etapa pendente do backend.

## Prévia com o Kubernetes local

No PowerShell, com o gateway encaminhado na porta 8086:

```powershell
$env:VITE_GATEWAY_URL='http://127.0.0.1:8086'
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

O proxy de desenvolvimento adapta `Origin` somente para requisições de mesma origem entre servidores loopback. Origens externas mantêm o cabeçalho original, para que a API continue recusando-as. O padrão sem a variável é `http://127.0.0.1:8080`.

## Verificação

```powershell
npm run build
npm run lint
npm run test:glass
npx playwright test e2e/auth-dashboard.spec.ts
```

A suíte de login/painel usa APIs simuladas para validar erros, renovação concorrente, logout, troca de loja, paginação, envio e acessibilidade no celular. Os testes legados de checkout cobrem rotas de outra versão da interface e precisam ser atualizados separadamente.

O visual violeta e os controles Liquid Glass continuam definidos em [DESIGN.md](./DESIGN.md). Os componentes Echo ficam em `src/components/echo`; os componentes de dispositivos, em `src/components/ui`.

## Início do Maker

Contas novas entram em /#/criar para escolher um ponto de partida. O Básico oferece templates; o Maker também oferece página em branco e a entrada de briefing para IA. A geração de IA está pendente de integração.

O editor usa uma área plana. O botão Visualizar abre a prévia em notebook ou tablet, com navegação por teclado e fechamento por Escape. Os dispositivos não ficam visíveis na entrada nem no editor.

Os rascunhos atuais usam uma chave por usuário. O rascunho global da versão anterior é preservado no navegador, mas não é aplicado a outras contas. A escolha de template começa sem produtos e categorias de demonstração. Em adequações de plano, os dados do catálogo são preservados. A gravação no servidor consulta as permissões reais da loja, em vez do plano de demonstração em localStorage.

Teste os novos fluxos com: npx playwright test e2e/maker-start.spec.ts e2e/auth-dashboard.spec.ts
## Aparência da plataforma

O tema claro (branco) é o padrão, inclusive quando o sistema operacional prefere o modo escuro. O usuário pode alternar entre Claro e Escuro em Configurações da conta → Aparência, na aba Minha conta do painel ou em Configurações da Loja no Maker.

A preferência é salva neste navegador por ID de usuário; ela não é compartilhada com outras contas. O rascunho da loja não é alterado ao trocar a aparência.

A paleta clara é gerada pelo motor de temas do Echo, preservando o violeta e as garantias de contraste. A paleta escura anterior continua disponível. Para regenerar a folha derivada após mudar a identidade global:

```powershell
node scripts/generate-appearance-theme.mjs
```

As telas de loja e os conteúdos de marca dentro dos dispositivos têm um escopo próprio de cores. Os controles do painel, Maker e configurações seguem a aparência escolhida.

Testes: `npx playwright test e2e/appearance.spec.ts e2e/maker-start.spec.ts e2e/auth-dashboard.spec.ts`.

### Templates Linha, Forma e Essencial

Os modelos enviados foram integrados à galeria, ao início do Maker, à área de criação e à prévia. As composições são definidas em `src/lib/maker.ts`, os blocos neutros em `src/lib/store-templates.ts` e o renderer em `src/components/store-preview.tsx`.

O catálogo demonstrativo é exclusivo da galeria. Uma loja nova recebe somente as seções do modelo, com produtos e categorias vazios. A identidade permite cor de ação, fonte dos títulos, logo por URL e imagem/descrição do destaque.

O `core-service` deve ser atualizado junto ao frontend: ele passa a reconhecer os IDs `linha`, `forma` e `essencial`, e a seção `category-list`. Sem essa atualização, um backend antigo rejeita o salvamento desses modelos no Standard. Nenhuma migration é necessária; o formato continua em JSONB, com `schemaVersion: 1`.

### Coleção premium

Presença, Impacto e Horizonte foram adicionados além da coleção original. A galeria oferece demonstração de variações, sacola lateral e frete simulado, identificada como exemplo e sem chamadas a pedidos, checkout ou cotação real. A demonstração fica isolada do catálogo do lojista; a área do Maker continua exibindo os dados do próprio rascunho.

A seção `product-detail` permite vincular um produto do catálogo pelo inspetor do Maker. Esse vínculo e as fontes do modelo são salvos no JSON. Atualize o `core-service` junto ao frontend para aceitar os IDs `presenca`, `impacto` e `horizonte` e o novo tipo de seção. Não há migration de banco.

Decisão confirmada: todos os modelos estão disponíveis no Básico de R$ 29 e no Maker de R$ 49. Premium identifica somente o estilo visual; a edição de estrutura continua exclusiva do Maker e os demais limites de cada plano permanecem. Para testar a lógica da sacola: `npm run test:templates`. As jornadas da galeria, acessibilidade e salvamento continuam em `e2e/maker-start.spec.ts`.

### Coleção Movimento (12 modelos no total)

Esta coleção adicional possui seis bases diferentes: Pulso (campanha com produtos em leque), Âmbar (editorial em duas colunas), Aurora (mosaico), Prisma (produto central com características e descrição), Vetor (catálogo com categorias laterais e busca de demonstração) e Éon (vitrine escura com faixa de produtos). Os cards mantêm o mesmo tamanho das outras coleções. Original e Premium permanecem disponíveis; todos os modelos podem ser usados nos dois planos, com suas permissões de edição habituais.

As artes da galeria ficam em `public/images/templates/movimento-*.webp`; a origem e os prompts estão em `../docs/motion-template-assets.md`. Foram geradas com a ferramenta integrada imagegen e exportadas para WebP sem alterar as dimensões ou remover a transparência. Elas não são adicionadas ao catálogo ao aplicar um modelo.

O hero aceita fotos com ou sem fundo, por URL ou pelo catálogo. No inspetor, escolha a apresentação e o enquadramento (imagem inteira ou preencher quadro). Pulso permite combinar até três produtos; as outras bases usam a primeira seleção. Prisma também permite preencher três características do produto. O `core-service` precisa ser atualizado junto para reconhecer os novos IDs e os campos de conteúdo `productIds[]`, `imagePresentation`, `imageFit` e `facts[]`. Não há migration.

O marquee e a flutuação podem ser pausados; a configuração de movimento reduzido é respeitada. As miniaturas ficam estáticas. A renderização está em `src/components/motion-storefront.tsx` e `src/components/showcase-bases.tsx`, compartilhando os dados JSON do Maker.

### Editor visual — fase 1
Workspace com duas colunas: personalização à esquerda e prévia com zoom/dispositivos à direita. O fluxo principal reúne Sua marca, Sua página e Cores e fontes; os ajustes avançados começam recolhidos. Schema Zod, renderer público e critérios: [maker-fase-1.md](../docs/maker-fase-1.md). Atualize o core-service junto ao frontend para aceitar os tokens e metadados e proteger o rodapé.

### Novo contrato Maker × Gerenciamento (fase 0)
A nova especificação separa aparência de operação. O pacote privado packages/store-contracts define os contratos, rotas e políticas da evolução, ainda sem substituir os fluxos existentes. Leia [maker-gerenciamento-fase-0.md](../docs/maker-gerenciamento-fase-0.md) para a matriz de responsabilidade, os critérios e a migração por fases. A implementação anterior ainda contém formulários operacionais no Maker; a remoção ocorrerá na migração das próximas fases.


### Simplificação da criação
A entrada recomenda o template como caminho mais rápido, mantendo a escolha inicial sem aplicar modelo automaticamente. O editor abre na marca; a capa fica selecionada para começar a editar a página. Reordenação, exclusão, enquadramento e cores adicionais ficam em grupos expansíveis. As ferramentas operacionais legadas continuam em Mais ferramentas, aguardando a migração descrita acima. Nenhum contrato de backend ou regra de assinatura foi alterado.

A jornada `Maker simples` em `e2e/maker-start.spec.ts` verifica o caminho principal, preservação do rascunho, restrições do Básico, ausência de overflow e acessibilidade no computador/celular. As chamadas de autenticação, plano e publicação são simuladas nos testes; não comprovam disponibilidade do backend em execução.
