# 0008. Aceite versionado dos Termos e nenhum cookie não essencial

- Situação: proposta (os textos legais aguardam revisão jurídica)
- Data: 2026-11-18

## Contexto
A Syndetis vende assinaturas pela internet e hospeda lojas que vendem a consumidores. Precisa provar que cada lojista
aceitou os Termos de Uso e conheceu a Política de Privacidade, e em qual versão. Lojistas chegam por dois caminhos: o
formulário de cadastro e o login com Google ou GitHub, que cria a conta antes de qualquer tela da Syndetis. Os textos
vão mudar, e cada mudança relevante precisa de um novo aceite. Cada serviço tem o próprio banco.

## Decisão
- **Os textos são arquivos versionados.** Ficam em `frontend/src/legal/*.md`; a versão é a data impressa no texto.
  O app os renderiza com um leitor de Markdown próprio, que só produz dados para o React (nenhum HTML do texto chega
  à página).
- **O aceite mora no auth-service**, que é dono da conta: tabela `legal_acceptances` (V6), uma linha por aceite, com
  as versões, a origem e a data. As versões em vigor ficam em `auth.legal.*`; o servidor só aceita essas.
- **Cadastro com e-mail:** o aceite é obrigatório no `POST /api/auth/register/seller` e gravado na mesma transação da
  conta. **Login social e versão nova:** o painel consulta `GET /api/auth/me/legal` e, se houver pendência, mostra a
  tela de aceite (`POST /api/auth/me/legal`). As páginas legais continuam abertas durante a pendência.
- **Se a consulta falhar**, o painel abre normalmente: o cadastro já exige o aceite, e travar todos os lojistas por
  uma falha de rede seria pior do que adiar a tela para o próximo acesso.
- **Sem banner de cookies.** O site só grava itens necessários (sessão, login social, carrinho, rascunhos do Maker,
  tema). Não há análise de audiência nem publicidade. A Política de Cookies lista cada item.

## Alternativas consideradas
- **Aceite como claim no JWT**, como o `doc_verified`: evitaria uma consulta, mas exigiria tokens novos a cada versão e
  não guarda o histórico que serve de prova.
- **Gravar IP e navegador no aceite:** prova mais forte, mas é dado pessoal a mais. Ficou como pendência jurídica.
- **Banner de cookies mesmo sem cookies opcionais:** pediria um consentimento que não muda nada e treina o usuário a
  clicar sem ler.

## Consequências
- Publicar uma versão nova é trocar a data em três lugares (texto, `LEGAL_VERSIONS`, `auth.legal.*`); um teste do
  frontend falha se eles divergirem.
- Quem entra com Google ou GitHub sem passar pelo cadastro vê uma tela a mais no primeiro acesso.
- **Se um dia entrar uma ferramenta de análise, pixel ou chat de terceiros**, ela só pode carregar depois de um
  consentimento explícito, com opção de recusar tão fácil quanto aceitar, e a Política de Cookies muda junto.
