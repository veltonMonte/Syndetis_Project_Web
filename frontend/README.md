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
