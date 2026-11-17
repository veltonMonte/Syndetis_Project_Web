# Maker visual — fase 1

A página inicial usa seções com layout automático. Após a revisão de usabilidade, o workspace reúne os controles à esquerda e a prévia à direita, com ações no topo. O caminho principal é Sua marca → Sua página → Cores e fontes; as ferramentas avançadas começam recolhidas. Não há posicionamento livre nesta fase.

## Dados e compatibilidade
O schema TypeScript/Zod em frontend/src/lib/editor-document.ts tem schemaVersion 1, tokens de tema, página, seções e slots/blocos de título, texto, imagem e botão. É uma projeção dos campos da fase 1; estilos por bloco e overrides ficam na fase 2. Ela acompanha rascunhos locais e exportações.

O contrato da API mantém schemaVersion 1, agora com IDs, tipo semântico do editor, tokens e links. Sem migration. O backend precisa ser atualizado junto ao frontend. O adaptador published-layout.ts permite que StorePreview renderize editor, dispositivos e vitrine pública.

## Entregue
- Workspace neutro, com modo claro/escuro da conta e sem o fundo decorativo da plataforma.
- Seleção de seção e conteúdo no mesmo painel, com nomes cotidianos, escolha pelo menu ou pelo lápis da prévia. Organização de seções e ajustes avançados em grupos expansíveis.
- Cores, 20 combinações de fontes carregadas, raio, respiro e escala do texto de apoio.
- Texto, URL/descrição de imagem, rótulo e endereço HTTP/HTTPS do botão.
- Aviso de contraste abaixo de 4,5:1 com correção e aviso de imagem sem descrição.
- Reordenação por arraste, botões e Alt+seta na camada. Somente Maker; Básico preserva a estrutura.
- Canvas de computador/tablet/celular e zoom Ajustar/50/75/100/125%.
- Salvamento local por conta e sincronização automática após 1,8 s sem edições válidas; fila de gravações serializada, reenvio explícito em falha e publicação com If-Match, confirmada pelo servidor.
- Vitrine pública em #/lojas/<slug>, com o renderer compartilhado, dados da API e o checkout já existente.
- Rodapé protegido no editor; servidor rejeita remoção de rodapé existente mesmo para Maker.
- Validação de URLs e tokens; texto renderizado como texto React. Campos incompletos continuam no rascunho local.

Checkout e sacola são áreas de sistema fora da lista editável. CNPJ, selo verificado, denúncia e links jurídicos dependem de dados e serviços reais; não foram inventados. O catálogo administrativo mantém o comportamento anterior e sua integração completa não é parte desta entrega.

## Critérios
| Critério | Estado |
| --- | --- |
| Alterar cor e fonte com prévia imediata | Atendido; meta de 30 segundos requer teste com lojistas |
| Reordenar por arraste e teclado | Atendido no Maker |
| Proteger rodapé e checkout existentes | Atendido |
| Proteger CNPJ e selo real | Depende da implementação de identidade/verificação |
| Desfazer por 50 passos | Atendido, com refazer e agrupamento da digitação |
| Personalizar só no celular | Fase 2 |
| Área livre, snap e guias | Fase 3 |
| Upload/recorte/otimização, histórico remoto, SSR e CSP de produção | Integrações futuras; imagens por URL nesta fase |

## Executar
No diretório frontend:

    npm ci
    npm run dev -- --host 127.0.0.1 --port 5175

Abra http://127.0.0.1:5175/#/criar e entre com uma conta de teste. Para salvar/publicar no servidor, execute gateway e core-service atualizados, com permissões e assinatura válidas. A publicação continua transacional. Esta implementação não publicou lojas nem realizou pagamentos.

## Verificar
No diretório frontend:

    npm run build
    npx playwright test e2e/editor-schema.spec.ts e2e/maker-start.spec.ts e2e/appearance.spec.ts e2e/auth-dashboard.spec.ts --workers=3
    npx echo-ui-cli check src/components/maker-studio.tsx src/components/maker-style-controls.tsx src/components/maker-canvas.tsx src/components/visual-maker.css

Os testes de interface usam respostas de API controladas e cobrem sucesso/falha ao publicar. Os testes unitários do backend cobrem templates, URLs, limites dos tokens e preservação do rodapé. Teste de carga e deploy remoto são etapas independentes.

## Paridade com os modelos
Os cards e o Maker usam o mesmo renderer, os mesmos presets e larguras lógicas de 1100/768/390 px. Cards usam o viewport de computador reduzido, preservando o layout mesmo em galerias estreitas. O Pulso mantém seu degradê de campanha ao mudar a cor de ação. Ao trocar de base, a identidade do modelo é reaplicada e o conteúdo personalizado continua preservado, com cópia do rascunho anterior. Produtos e fotos de demonstração não são adicionados ao catálogo.


## Refinamento de usabilidade — 31/10/2026

O primeiro acesso continua sem um template aplicado. Ao escolher um template, o assistente pede segmento, visual e nome/logo em três passos. O segmento prepara textos editáveis. Conforme decisão do usuário, produtos e categorias reais começam vazios; exemplos existem somente nas prévias.

O editor concentra as ferramentas em **Sua página** e **Sua marca**. O canvas permite editar títulos e textos diretamente; a barra contextual identifica a seção e oferece mover, duplicar e excluir conforme o plano. Blocos podem ser inseridos entre seções por uma galeria visual agrupada. O rodapé continua protegido. Trocar visual fica sempre no cabeçalho e usa miniaturas do renderer compartilhado.

Desfazer/refazer guarda até 50 ações durante a sessão. Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl/Cmd+D, Delete e Escape atuam fora de campos de texto; nos campos, o navegador mantém a edição nativa. A exclusão usa confirmação inline, sem modal, seguida de aviso com Desfazer. As cópias locais de versões são limitadas a dez por conta/loja e não são backup remoto. Restaurar preserva os metadados de uma publicação já confirmada e respeita as permissões atuais do plano.

A sincronização automática distingue rascunho local, espera, envio, confirmação e falha. Não apresenta uma gravação recusada como salva no servidor. Edições incompletas continuam locais. O primeiro rascunho só sincroniza após uma edição válida ou ação explícita. Não há publicação automática. A revisão de publicação lista problemas de conteúdo, contraste e diferenças contra a última publicação registrada localmente; Pix, domínio e identidade não são marcados como verificados sem integração real.

O checklist usa dados do rascunho (nome, visual, logo e três produtos), sem percentual fictício de prontidão operacional. A área Sua marca reúne logo, cor principal, fontes e cantos; ajustes adicionais ficam recolhidos. No celular, controles de arraste e inserção no canvas são ocultos e a edição de conteúdo permanece acessível.

### Limites e etapas seguintes

- Histórico remoto, link compartilhável de rascunho e diferenças contra a publicação em outro dispositivo dependem de endpoints próprios.
- Upload/recorte, extração de paleta do logo, importação de produtos por planilha/foto e geração de conteúdo/imagens por IA ainda não estão integrados.
- Edição rápida de preço/estoque no canvas, migração completa do catálogo para Gerenciamento e paleta de comandos Ctrl+K não fazem parte deste refinamento.
- O modo mobile tem edição responsiva simplificada; não há overrides de layout por dispositivo.
- Os testes de interface usam API controlada. É necessário validar com gateway/core atualizados antes de disponibilizar o fluxo em produção. O build ainda apresenta o aviso existente de bundle JavaScript acima de 500 kB.

### Componentes Echo

ConfirmButton e Morph foram obtidos do registro oficial (`https://echo-ui.com/e/confirm-button.json` e `https://echo-ui.com/e/morph.json`). Foram adicionados somente os arquivos ausentes. A instalação automática detectou que sobrescreveria HardwareButton personalizado; suas dependências locais foram preservadas. Toast agora aceita ReactNode no corpo para compor a ação Desfazer.
