# Fase 0 — contrato Maker × Gerenciamento

Especificação recebida em 30/10/2026. Esta entrega define e testa contratos; não muda telas, não cria APIs, não aplica migrations e não publica lojas. O novo roteiro substitui a numeração de fases usada nas entregas anteriores. O documento maker-fase-1.md continua sendo o histórico do editor existente.

## Decisões

- Maker escreve aparência e referências; Gerenciamento escreve dados operacionais.
- Dados têm schemaVersion 1, dataRevision e revisão por entidade. Layout tem schemaVersion 2 e layoutRevision independente. A versão 2 distingue este contrato do layout legado de API/editor v1.
- Um único layout por tipo de página. Produtos e categorias não duplicam layouts por item. Exceções por item ficam para depois.
- Identificadores de entidade são UUID; nós de layout têm IDs locais estáveis. Links internos guardam IDs e o resolvedor busca o slug atual.
- Valores monetários no contrato são centavos inteiros em BRL. Estoque e totais são autoritativos no servidor. O comando de pedido não aceita preços nem cartão.
- Dados reais/exemplo são contexto de visualização. Dados de exemplo nunca são parte do layout nem de um comando de gravação.
- O contrato inclui os 12 modelos existentes sem removê-los. A próxima fase implementará primeiro um modelo navegável; Linha é a base proposta por ser a integração mais simples.
- Perfil designer é uma associação por loja, separada do role global do JWT. Por padrão ele edita/pré-visualiza o Maker e lê apenas a projeção de seleção; não opera dados nem publica sem uma futura delegação explícita.

## Fluxo proposto

~~~mermaid
flowchart LR
  G[Gerenciamento] --> D[Dados operacionais / dataRevision]
  M[Maker] --> L[Layout / layoutRevision]
  D --> R[Resolvedor por ID e renderer compartilhado]
  L --> R
  R --> E[Editar / selecionar]
  R --> V[Visualizar / pagamento simulado]
  R --> P[Loja publicada / dados reais]
~~~

O diagrama é o contrato da evolução. A integração v2 ainda não está ligada ao app. O renderer atual StorePreview permanece na versão anterior até a migração da fase 1/2.

## Tabela de responsabilidade

| Domínio | Gerenciamento | Maker |
| --- | --- | --- |
| Produto, variações, preço, estoque, fotos, SEO | Cadastrar, editar, excluir e ordenar | Selecionar IDs/fontes já existentes; estilo dos cards |
| Categoria e coleção | Árvore, posição, imagens, regras e membros | Selecionar a categoria/coleção exibida |
| Aviso e pop-up | Texto, destino, público, agendamento e ativação | Estilo, posição e fonte por ID; nunca editar o aviso |
| Pedidos e clientes | Dados privados e operações autorizadas | Nenhum cadastro ou acesso administrativo |
| Cupom | Regras e vigência | Aparência dos elementos que o exibem |
| Frete e retirada | CEP, preço, prazo e endereço | Aparência; não alterar cálculo ou endereço |
| Pagamentos | Conectar provedor e conta do lojista | Tema do checkout; nenhum segredo ou cartão |
| Empresa e verificação | Razão social, CPF/CNPJ, contatos e decisões do serviço | Exibir a projeção pública, sem alterar o selo |
| Páginas e políticas | Título, slug e texto publicado | Layout institucional único; fonte current-page-content |
| WhatsApp e Instagram | Número e usuário configurados | Escolher a ação e, no WhatsApp, mensagem; canal vem do perfil |
| Domínio, equipe e permissões | Administração do proprietário | Sem administração |
| Tema, fontes, cores, espaçamentos e ordem das seções | Sem vínculo a dados operacionais | Editar conforme plano e permissão |
| Banners e imagens decorativas | Biblioteca com escopo/purpose validados | Conteúdo de marca e composição |

A matriz executável está em ownership.ts. A interface futura oferece “Cadastrar no gerenciamento” quando a fonte não existir; o link abre a rota administrativa em nova aba. Não haverá formulários operacionais dentro do Maker.

## Schemas entregues

Pacote packages/store-contracts, exportando tipos inferidos do Zod:

| Arquivo | Responsabilidade |
| --- | --- |
| primitives.ts | IDs, centavos, URL HTTPS, mídia, visibilidade e metadados |
| data.ts | Product, Variant, Category, Collection, Notice, Order, Customer, ShippingRule, PageContent, StoreProfile, projeção pública e snapshot |
| layout.ts | Tema, páginas, seções, blocos, bindings, ações e contexto de prévia |
| commands.ts | Gravação de produto/categoria/aviso e rascunho visual, separados |
| policies.ts | Preservação dos blocos, referências por loja, publicação e agendamento |
| ownership.ts | Papel por loja, permissões e tabela de responsabilidade |
| routes.ts | Rotas canônicas, atalhos e resolução de IDs para slugs |
| states.ts | Carregando, vazio, erro, pronto, não encontrado e indisponível |

Product.images é dado do gerenciamento. Estoque disponível é uma projeção de leitura; movimentação de estoque terá seu comando próprio. A mídia decorativa do layout referencia assetId, não executa HTML/JS nem aceita CSS arbitrário. Na integração, a API também deverá verificar escopo e finalidade da mídia.

PageContent v1 é texto simples. Renderizadores devem tratá-lo como texto; texto rico exigirá um formato estruturado e sanitização próprios. A sintaxe opaca do documento fiscal não confirma validade, titularidade ou identidade. Verificação permanece um resultado autoritativo do backend.

## Rotas canônicas da loja

São caminhos relativos ao host/escopo da loja. Não são novas rotas já disponíveis no servidor atual.

| Grupo | Tipo de layout | Caminho | Fase |
| --- | --- | --- | --- |
| Início | home | / | 1 |
| Categoria/coleção | category | /categoria/:slug | 1 |
| Produto | product | /produto/:slug | 1 |
| Busca | search | /busca?q=... | 1 |
| Sacola | cart | /sacola; também pode abrir gaveta | 1 |
| Checkout | checkout | /checkout | 1 |
| Concluído | order-success | /pedido/:id/concluido | 1 |
| Acompanhamento | order-tracking | /pedido/:id | 1 |
| Entrar | login | /entrar | 3 |
| Cadastro | register | /criar-conta | 3 |
| Recuperação | password-recovery | /recuperar-senha | 3 |
| Minha conta | account | /conta | 3 |
| Sobre, Contato, Trocas, Privacidade e Termos | institutional | /p/:slug | 3 |
| Não encontrado | not-found | fallback de rota | 3 |
| Indisponível | unavailable | /indisponivel | 3 |

As 13 famílias do pedido resultam em 15 tipos de layout porque autenticação se divide em três telas. Páginas institucionais usam um layout único e registros de conteúdo independentes.

Ferramentas propostas:

- /maker/:storeId/:pageType — aparência.
- /gerenciamento/:storeId/products, categories, collections, notices, orders, customers, coupons, shipping, payments, profile, verification, pages, channels, domain, team — operação.
- Hoje a SPA usa #/criar, #/dashboard e #/lojas/:slug. Esses caminhos existentes continuam funcionando; não foram substituídos nesta fase.

## Botões e modos

- Navegação interna: PageTarget por tipo + ID de produto/categoria/página; sem campo de URL.
- Sacola: open-cart. Compra é o sistema buy no contexto do produto, não uma ação livre em botão de marca.
- Rolar: referência a sectionId da página atual.
- WhatsApp/Instagram: resolvidos usando o perfil atual da loja. Canal ausente retorna estado de indisponibilidade, sem inventar contato.
- Link externo: tipo external com HTTPS sem credenciais, advanced=true e acknowledgeExternal=true.
- Editar: seleção de nó; um controle de navegação deverá oferecer “Editar página: …”.
- Visualizar: ativa a navegação e sacola do renderer, com pagamento obrigatoriamente simulado.
- Publicado: dados reais e checkout com campos hospedados pelo provedor. Nenhuma chave/credencial ou número de cartão pertence a estes schemas.

A seleção/ativação no renderer e a barra flutuante ainda serão implementadas nas fases 1/2; o contrato de contexto já as distingue. A área livre só admite conteúdo decorativo limitado; campos de sistema não podem ser transferidos para ela.

## Proteções de contrato e integração

O layout exige sacola no cabeçalho e rodapé legal, verificação e denúncia no rodapé. Produto exige preço, compra e frete. Checkout usa um único bloco de sistema; não admite banners que alterem etapas. Formulários de autenticação/conta e resumos de pedido são sistemas.

Estes blocos ficam visíveis nos três dispositivos. Não podem ser ocultados pelo contêiner, encolhidos abaixo de 14 px, substituídos por outro ID ou movidos para outro contexto. Reordenação dentro do contexto é permitida. O backend deve validar schema, transição, escopo, permissões e plano, não apenas confiar em um sinal locked.

Selo não significa que uma loja está verificada: o renderer só apresenta o resultado real do serviço. CNPJ/CPF completos e segredos do provedor não entram na projeção para o Maker. A API precisa gerar documentDisplay adequado, sem expor documento pessoal bruto nem inventar dados ausentes.

canPerform é a especificação pura da política futura, não um novo mecanismo de autenticação já instalado. A associação deve vir da sessão validada no servidor. O plano continua limitando edição estrutural; ser designer não libera recursos pagos nem edição de dados.

## Versionamento e publicação

- Gravar produto/aviso usa revisão da entidade; não envia layoutRevision.
- Gravar/publicar layout envia apenas o documento visual e a revisão esperada; não envia catálogo.
- A publicação futura fará a checagem de versão e a troca atômica do ponteiro publicado em transação, validando referências no estado real da loja.
- Campos esperados com revisão divergente devem retornar conflito; nenhuma resolução automática apaga edições.
- Snapshot de dados é lido independentemente do visual. Alterar preço, estoque, aviso ou slug não exige republicar o layout.
- Avisos usam timestamps com offset, início inclusivo e fim exclusivo. Agendamento é operação do backend; o helper não é um cron nem substitui a filtragem por público no servidor.
- origin=real não é uma autorização fornecida pelo cliente. Na integração, o servidor deve recusar gravações derivadas do dataset de exemplo e resolver todos os IDs no escopo autorizado.

## API atual verificada versus lacunas

Caminhos abaixo são os controladores do core-service, antes do prefixo/roteamento do gateway:

| Área | Evidência atual | Lacuna |
| --- | --- | --- |
| Produtos | /api/stores/:id/products, leitura individual e CRUD | Slug de produto, variações, imagens múltiplas e schema novo |
| Categorias | /api/stores/:id/categories com nome, slug e posição | Árvore, imagem e coleções |
| Catálogo público | /api/public/stores/:slug/products e categories; produto por ID; filtros q/category/sort | Rotas públicas por slug e ordenação por métricas reais |
| Estoque | /api/stores/:id/inventory e movimentos | Adaptador para disponibilidade de produto/variante |
| Layout | GET/PUT /api/stores/:id/layout e POST publish; JSON legado v1 | Adaptador/migration controlada para v2 e registro por tipo de página |
| Pedidos | /api/orders, /me, /:id, cancelamento | Checkout navegável em etapas no modelo |
| Clientes/endereço | /api/customers/me e addresses | Projeção administrativa por loja e telas de conta |
| Avisos e coleções | Sem controlador encontrado | Implementar na fase 1 |
| Verificação, equipe/designer, políticas e canais | Sem módulos completos encontrados | Implementações posteriores |
| Pagamento | /api/orders/:id/payment e payment/sync | Confirmar conexão/credenciais por lojista e destino do recebimento; não assumir que o fluxo atual já cumpre o novo modelo |

Nenhum endpoint inexistente é chamado pelo pacote. Não há migration automática do v1 nem mudança no pagamento em execução.

## Sequência a partir desta entrega

1. Gerenciamento mínimo real: produtos, categorias e avisos; adaptar DTOs/APIs e testes. Fazer uma loja Linha navegar pelas oito páginas do MVP com as mesmas fontes.
2. Migrar o Maker: remover os formulários de produto/categoria/aviso, adicionar seleção de fontes, ações tipadas e modos Editar/Visualizar. Ligar o novo contrato ao renderer e à publicação.
3. Demais páginas e ferramentas avançadas.
4. Propagar para os outros modelos, área livre e assistente de IA.

Hoje ainda há formulários operacionais no Maker e controles de link da implementação anterior. Isso está identificado como dívida de migração; não foi ocultado nem apresentado como separação concluída.

## Aceitação

| Critério do pedido | Estado nesta entrega |
| --- | --- |
| Schemas de dados/layout versionados e separados | Atendido em código |
| Matriz de responsabilidade e mapa de rotas | Atendido |
| Ações internas por ID e link externo avançado | Atendido no contrato e nos testes; UI ainda legada |
| Preço/estoque/avisos fora do layout | Atendido no novo contrato; app migrará nas fases 1/2 |
| Designer sem operação e escopo por loja | Política testada; backend/membership ainda não integrados |
| Blocos de sistema não removíveis/ocultáveis | Contrato e testes atendidos; integrar no renderer/backend novo |
| Dados de exemplo nunca salvos/publicados | Contrato e testes atendidos; alternância visual será integrada |
| Loja navegável completa e dados reais | Fase 1 em um modelo |
| Modos Editar e Visualizar com cliques funcionais | Fases 1/2 |
| Desfazer por 50 passos e overrides por dispositivo | Fase 3 |
| Publicação, histórico, SSR, uploads e CSP de produção | Evolução do backend/renderer; não entregue pela fase 0 |
| Troca de tema em 30 s e desempenho em celular simples | Exige teste com lojistas e medição da UI, ainda não atestado |

## Rodar e verificar

No diretório packages/store-contracts:

    npm ci
    npm run check
    npm run build
    npm test

Node >=22.18. A compilação gera JavaScript ESM e declarações em dist. O pacote é privado e exporta @syndetis/store-contracts para adoção posterior pelo frontend e integration-hub. Apps existentes ainda não têm essa dependência instalada.

Os testes não fazem rede, não criam lojas/pedidos, não usam cartões e não publicam. Validam separação de campos, revisões, referências, links, contextos, agendamento e proteção de blocos.

A CI possui um job isolado Store Contracts, que instala, confere os tipos, compila e testa o pacote sem Docker nem credenciais. O job foi adicionado ao workflow; a execução remota ocorrerá quando o código for enviado ao GitHub.
