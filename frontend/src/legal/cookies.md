# Política de Cookies da Syndetis

Versão 2026-11-18 · Vigente a partir de [PREENCHER: data de publicação]

> **Rascunho para revisão jurídica.** Este texto ainda não foi revisado por um advogado e não deve ser publicado como versão definitiva antes dessa revisão. Os trechos marcados com [PREENCHER] dependem de dados ou decisões da empresa.

Cookies são pequenos arquivos que um site grava no seu navegador. O armazenamento local (`localStorage` e `sessionStorage`) faz algo parecido, guardando informações no próprio navegador. Esta Política lista o que a Syndetis grava e por quê.

## 1. Resumo

- A Syndetis usa **apenas** cookies e armazenamento local **necessários** para o site funcionar: manter você conectado, concluir o login social e guardar rascunhos e preferências.
- A Syndetis **não** usa cookies de publicidade, de rastreamento entre sites nem ferramentas de análise de audiência (como Google Analytics ou pixels de redes sociais).
- Por isso o site não mostra um banner pedindo consentimento. Esses itens são tratados com base na execução do contrato e no legítimo interesse (art. 7º, incisos V e IX, da LGPD), como orienta o Guia Orientativo sobre Cookies da ANPD.
- Se um dia passarmos a usar cookies que não sejam necessários, eles só serão gravados depois do seu consentimento, pedido em um banner com a opção de recusar, e esta Política será atualizada.

## 2. Cookies da Syndetis

| Nome | Quem grava | Para quê | Duração |
| --- | --- | --- | --- |
| `SESSION` | Serviço de autenticação da Syndetis | Concluir com segurança o login com Google ou GitHub. É `HttpOnly` e `SameSite=Lax` | Até o fim do login ou do tempo de inatividade da sessão |

## 3. Armazenamento local da Syndetis

| Chave | Tipo | Para quê | Duração |
| --- | --- | --- | --- |
| `syndetis.session.v2` e `syndetis-auth-meta-v1` | `sessionStorage` | Manter você conectado nesta aba (tokens de acesso e nome exibido) | Até fechar a aba ou sair da conta |
| `syndetis-legal-intent-v1` | `sessionStorage` | Lembrar, durante o login com Google ou GitHub, que você aceitou os Termos na página de cadastro | Até voltar do login ou fechar a aba |
| `cart:<loja>` | `sessionStorage` | Guardar o carrinho de uma loja | Até fechar a aba |
| `checkout:<conta>:<loja>` | `sessionStorage` | Evitar pedidos duplicados se a página recarregar durante o pagamento | Até o pedido ser concluído ou a aba fechada |
| `syndetis-maker-v1`, `syndetis-maker-project-v1:*`, `syndetis-maker-name-v1:*`, `syndetis-maker-versions:*`, `syndetis-maker-previous:*` | `localStorage` | Guardar rascunhos, versões e o nome da loja na Sessão Maker, para você não perder o trabalho | Até você apagar os dados do navegador |
| `syndetis-appearance-v1:*` | `localStorage` | Lembrar se você prefere o tema claro ou escuro | Até você apagar os dados do navegador |

## 4. Cookies de terceiros

Alguns serviços que usamos gravam cookies nos próprios domínios, sob as políticas deles:

- **Cloudflare**, que entrega o site, pode gravar cookies de segurança (como `__cf_bm`) para diferenciar pessoas de robôs. São necessários para proteger o site.
- **Google e GitHub** gravam cookies nas próprias páginas quando você escolhe entrar com essas contas.
- **Mercado Pago** grava cookies nas próprias páginas quando o Comprador paga um pedido.

## 5. Como controlar

Você pode apagar ou bloquear cookies e o armazenamento local nas configurações do navegador. Se bloquear os itens necessários, o login, o carrinho e os rascunhos da Sessão Maker deixam de funcionar.

## 6. Contato

Dúvidas sobre esta Política: [PREENCHER: e-mail do encarregado].
