# Documentos legais

> **Rascunho.** Nenhum destes textos foi revisado por um advogado. Eles foram escritos a partir do que o código
> faz hoje e precisam dessa revisão, e dos dados marcados com `[PREENCHER]`, antes de valerem como versão definitiva.

Os textos ficam em `frontend/src/legal/`, em Markdown. O app os lê de lá, então a página pública e o arquivo que o
advogado revisa são o mesmo.

| Texto | Arquivo | Página |
|---|---|---|
| Termos de Uso (lojista), com o acordo de tratamento de dados (Syndetis operadora) | [termos-de-uso.md](../../frontend/src/legal/termos-de-uso.md) | `#/legal/termos-de-uso` |
| Política de Privacidade (LGPD: controladora e operadora) | [privacidade.md](../../frontend/src/legal/privacidade.md) | `#/legal/privacidade` |
| Política de Cookies | [cookies.md](../../frontend/src/legal/cookies.md) | `#/legal/cookies` |
| Planos, teste grátis de 7 dias e assinatura (cancelamento, reembolso, CDC art. 49) | [assinatura.md](../../frontend/src/legal/assinatura.md) | `#/legal/assinatura` |
| Selo Verificado Syndetis (CNPJ opcional) | [selo-verificado.md](../../frontend/src/legal/selo-verificado.md) | `#/legal/selo-verificado` |
| Modelo de termos e política para as lojas (Decreto nº 7.962/2013) | [modelo-para-lojas.md](../../frontend/src/legal/modelo-para-lojas.md) | `#/legal/modelo-para-lojas` |

`#/legal` lista todos. O rodapé tem os links, o cadastro tem a caixa de aceite, a página de planos aponta para as
regras da assinatura e o checkout aponta para a Política de Privacidade.

## Como o aceite é registrado

- **Cadastro com e-mail e senha.** A caixa "Li e aceito os Termos de Uso… e estou ciente da Política de Privacidade"
  é obrigatória. O formulário envia `acceptedTermsVersion` e `acceptedPrivacyVersion` para
  `POST /api/auth/register/seller`. O auth-service recusa o cadastro sem elas (400) ou com uma versão que não está em
  vigor (409), antes de consultar a Receita Federal, e grava o aceite na mesma transação que cria a conta.
- **Google ou GitHub.** Quem marca a caixa na página de cadastro e escolhe o login social tem o aceite gravado ao
  voltar (a intenção fica no `sessionStorage` da aba). Quem entra direto pela página de login vê a tela
  "Antes de começar" e só chega ao painel depois de aceitar (`POST /api/auth/me/legal`).
- **Versão nova.** Trocar as versões faz todo lojista ver a tela "Os Termos de Uso mudaram" no próximo acesso.
- **O que é guardado.** Tabela `legal_acceptances` do auth-service (migração `V6__legal_acceptances.sql`): conta,
  versão dos Termos, versão da Política, origem (`SIGNUP` ou `IN_APP`) e data e hora. Uma linha por aceite; aceitar de
  novo a mesma versão não duplica. Não guardamos IP nem navegador (minimização); veja as pendências.
- **Cookies.** O site só usa cookies e armazenamento local necessários, então não há banner de consentimento. A
  decisão e o que muda se isso deixar de ser verdade estão no [ADR 0008](../architecture/adr/0008-aceite-dos-termos-e-cookies.md).

### Publicar uma versão nova

1. Edite o texto em `frontend/src/legal/` e troque a data da linha "Versão AAAA-MM-DD".
2. Troque a mesma data em `LEGAL_VERSIONS` (`frontend/src/lib/legal-versions.ts`) e em `auth.legal.*`
   (`services/auth-service/src/main/resources/application.properties`). O teste `npm run test:legal` falha se as
   três não baterem.
3. Avise os lojistas com a antecedência que os Termos prometem (seção 15).

## Pendências que dependem de uma decisão da empresa ou de um advogado

Os textos marcam cada uma com `[PREENCHER]` ou `[REVISAR]`. Os dados da empresa também ficam em
`SYNDETIS_COMPANY` (`frontend/src/lib/legal-versions.ts`), que o rodapé mostra.

**Identificação e contatos**

- Razão social, CNPJ e endereço da Syndetis (exigidos pelo Decreto nº 7.962/2013, art. 2º).
- Encarregado pelo tratamento de dados (DPO): nome e e-mail (LGPD, art. 41). Se a empresa for de pequeno porte, a
  Resolução CD/ANPD nº 2/2022 dispensa a indicação, mas exige um canal de comunicação com os titulares.
- E-mails de atendimento, de segurança e de denúncias.
- Data de publicação (início de vigência) de cada texto.

**Termos de Uso**

- Foro de eleição (comarca).
- Lista final de produtos e serviços proibidos.
- Cláusula de limitação de responsabilidade: validade se o lojista for considerado consumidor (CDC, art. 51).
- Prazo de aviso antes de mudar os Termos (sugerido: 15 dias).
- Prazo para o lojista exportar os dados depois do encerramento, e prazo de eliminação.
- Prazo para avisar o lojista de um incidente de segurança (sugerido: 48 horas).
- Prazo de aviso antes de trocar suboperadores.
- Confirmar que não haverá taxa por venda.
- Provedor de IA e se ele usa os dados enviados para treinar modelos.
- Meta de disponibilidade e política de backup, se houver.

**Privacidade e cookies**

- Provedores de e-mail, WhatsApp e IA (hoje o código só registra e-mails e mensagens em log).
- Região de processamento do Mercado Pago e da BrasilAPI.
- Mecanismo de transferência internacional (LGPD, art. 33): cláusulas-padrão da Resolução CD/ANPD nº 19/2024 com
  AWS, Neon e Cloudflare, ou outro.
- Prazos de retenção depois do encerramento da conta e da loja; prazo de guarda dos registros de aceite.
- Onde são guardados os registros de acesso de 6 meses exigidos pelo art. 15 do Marco Civil (gateway, Cloudflare ou
  outro). Hoje não há uma guarda definida.
- Se o registro de aceite deve incluir IP e navegador como prova (hoje não inclui, por minimização).
- O registro de aceite é apagado junto com a conta (`ON DELETE CASCADE`). Decidir se ele deve sobreviver à exclusão
  pelo prazo de prescrição, como prova.

**Assinatura e teste grátis**

- Tributos incluídos no preço e emissão de NFS-e.
- Formas de pagamento aceitas no Asaas (o código usa `billingType: UNDEFINED`, então o lojista escolhe na página do
  Asaas). A página de planos fala em "Pix e cartão": alinhar.
- Teste grátis: plano incluído (Standard ou Maker), se exige cartão, como o convite chega (DM no Instagram, código),
  prazo de guarda dos dados depois do fim. **O core-service ainda não tem lógica de teste grátis**
  (`docs/integrations/assinaturas-asaas.md` diz "sem teste gratuito"); a regra precisa existir no código antes de
  4/1/2027.
- Direito de arrependimento para empresas: concedido a todos por escolha comercial; confirmar.
- Prazo do reembolso e regra para indisponibilidade da plataforma.
- Prazo de aviso antes de reajuste de preço (sugerido: 30 dias).
- Cancelamento pelo painel: confirmar que existe na interface (o backend tem a rota; a página de planos promete
  "cancelamento diretamente pelo seu Painel da Loja").

**Selo Verificado**

- Periodicidade de nova consulta do CNPJ e fluxo para retirar o selo (hoje não existem).
- Os textos assumem o CNPJ opcional e sem CPF, da [ADR 0007](../architecture/adr/README.md) (PR "CNPJ opcional com
  selo Verificado Syndetis"). Até esse PR entrar, o cadastro ainda pede CPF ou CNPJ.

**Lojas (modelo para compradores)**

- Direito de arrependimento em alimentos preparados e em ingressos (até quando antes do evento).
- O app ainda não mostra os dados do vendedor nem os termos de cada loja na vitrine: o lojista não tem onde colar o
  modelo. Essa é a próxima entrega para cumprir o Decreto nº 7.962/2013 nas vitrines.
- Compradores que criam conta no checkout (`/api/auth/register`) não marcam aceite: eles compram sob os termos da
  loja. Decidir se a conta de comprador precisa de um aceite próprio.
