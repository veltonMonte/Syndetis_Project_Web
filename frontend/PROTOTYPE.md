# Frontend de testes Syndetis

## Executar

```powershell
cd frontend
npm ci
npm run dev
```

React 19, TypeScript, Vite e Tailwind CSS 4 já estão configurados. O plugin oficial `@tailwindcss/vite` processa o import de Tailwind em `src/index.css`. O alias `@/` aponta para `src/` no Vite e no TypeScript.

## Estrutura de componentes e estilos

- `src/components/ui/`: MacbookPro, Iphone e seus demos; caminho `@/components/ui`. É a pasta de componentes reutilizáveis esperada pela configuração shadcn, permitindo que imports de componentes externos sejam resolvidos sem adaptações por página.
- `src/components/echo/`: componentes oficiais instalados pelo CLI Echo UI, incluindo botões, campos, cards, layout e notificações.
- `components.json`: configuração compatível com shadcn. Para adicionar um componente futuramente: `npx shadcn@latest add <componente>`. Os controles destas telas usam Echo, evitando misturar dois estilos de controles.
- `src/index.css`: Tailwind, semântica de cores e estilos globais.
- `src/App.css`: composição das páginas e mockups dos dispositivos.
- `src/components/echo/echo-theme.css`: tema gerado pelo CLI. Alterações via `npx echo-ui-cli style set`, sem editar o arquivo gerado.

O MacBook usa a moldura vetorial com `viewBox` fixo e `useId` para recortes e gradientes independentes. O conteúdo React da tela é uma camada HTML posicionada sobre a moldura, evitando rasterização de texto em `foreignObject`. Aceita `width`, `height`, `src`, atributos SVG e `children`. O Iphone tem moldura metálica, ilha de câmera, barra de status e aceita `children`, `className` e atributos HTML; `Component` continua disponível como alias. Ambos são dimensionados diretamente, sem perspectiva ou escala CSS no hero. Demos em `src/components/ui/demo.tsx`.

## Páginas e testes manuais

| Rota | Experiência |
| --- | --- |
| `/#/` | Apresentação, dispositivos, recursos e modelos |
| `/#/modelos` | Escolha de modelo com acesso direto à personalização |
| `/#/sobre` | Contexto do projeto e tutorial de quatro passos com revelações no scroll |
| `/#/criar` | Ideia → estrutura → identidade, inspirada no fluxo de criação do Gamma |

1. Abrir o Maker e avançar com a descrição vazia: mensagem de erro em texto.
2. Escolher um tipo de negócio, escrever uma descrição ou usar uma sugestão e preparar a estrutura.
3. Personalizar nome, apresentação, modelo e cor; conferir prévias desktop e celular.
4. Salvar rascunho, recarregar a página e clicar em continuar rascunho salvo.
5. Exportar a configuração e conferir `syndetis-layout-config.json`.
6. Testar o menu móvel, navegação pelo teclado e preferência de movimento reduzido.

```powershell
npm run build
npm run lint
npm run test:glass
npx echo-ui-cli check
npx echo-ui-cli test / /#/sobre /#/modelos /#/criar --url http://127.0.0.1:5173
```

## Limites do protótipo

Os botões usam refração óptica do backdrop por filtro SVG e mapa de deslocamento da borda de uma cápsula, seguindo o mecanismo `liquid-refract` da [referência glasscn](https://github.com/kostyniuk/glasscn-components). O mapa geométrico é gerado localmente e reutilizado num cache limitado; `ResizeObserver` acompanha o tamanho do controle. A mola do ponteiro modifica a curvatura e uma pequena ondulação do fundo, sem camadas luminosas, halos ou filtros no rótulo. A refração completa é aplicada em navegadores Chromium (Chrome, Edge e Brave); os demais recebem vidro transparente com desfoque leve. Com movimento reduzido ativo, a lente permanece estática. O controle “Ativar líquido” permite experimentar a animação durante a sessão sem alterar o sistema; “Pausar líquido” interrompe o movimento imediatamente.

A comparação visual está em `/tests/fixtures/liquid-lens.html` com o servidor Vite ativo: grade sem lente à esquerda e a mesma grade refratada à direita. Esse fixture não faz parte da navegação nem do build de produção. Os testes `npm run test:glass` validam centro plano, bordas com deslocamento simétrico e ausência de buracos no mapa.

O hover usa a base imóvel para medir o ponteiro e manter o movimento estável nas bordas. A mesma mola controla deslocamento, elasticidade e pressão; um campo de ondulação desloca o fundo sem iluminar a superfície. No hero, `DeviceStorefront` compõe duas telas complementares (coleção e produto) com a imagem local `public/images/oliva-ceramics.png`, gerada para este protótipo. Preços e produtos são exemplos visuais; os controles impressos dentro dos aparelhos são parte da ilustração. O Maker continua renderizando `StorePreview` a partir da configuração editável.

A preparação da estrutura é uma simulação determinística local, sem chamada a um modelo de IA. Não há autenticação, publicação, checkout ou integração com microsserviços. O rascunho é salvo explicitamente em `localStorage`, na chave `syndetis-maker-v1`; o conteúdo é validado ao carregar e erros de armazenamento são comunicados. O JSON exportado corresponde a `LayoutConfig`, com versão, nome, descrição, tipo de negócio, modelo e cor. A futura API pode persistir esse contrato em `layout_config` JSONB.

As vitrines são prévias ilustrativas, com produtos e imagens de exemplo. Fotografias externas do Unsplash exigem internet. As cores de conteúdo da vitrine e do desenho MacBook são declaradas em `echo.json.check.colours`, pois representam marcas editáveis e o componente fornecido; os controles do Maker continuam usando os tokens Echo. O texto sobre a cor escolhida usa contraste calculado por luminância.

Referências: capturas fornecidas pelo usuário (Resend, Liquid Glass e seletor de cores) e [Gamma](https://gamma.app/) para o fluxo de ideia, estrutura e refinamento.
