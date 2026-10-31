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
- Autosave local por conta; sincronização manual e publicação com If-Match, confirmada pelo servidor.
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
| Desfazer por 50 passos | Fase 2 |
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
