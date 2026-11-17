# 0004. Conta de lojista só com CPF ou CNPJ ativo na Receita Federal

- Situação: aceita; a parte de CPF foi substituída pela [0006](0006-lojista-somente-cnpj.md) (só CNPJ)
- Data: 2026-11-16

## Contexto
Lojistas recebem dinheiro de compradores pela plataforma. Contas com documentos inventados, cancelados ou de
terceiros são um risco para compradores e para a Syndetis.

## Decisão
Uma conta de lojista é criada se, e somente se, a Receita Federal confirmar o documento:
- **CNPJ**, pela BrasilAPI (dados abertos da Receita): situação ATIVA; também informa razão social e MEI.
- **CPF**, pela Consulta CPF v3 da SERPRO: CPF e data de nascimento conferem e a situação é REGULAR.

A consulta roda no integration-hub; o auth-service a chama antes de gravar a conta e falha fechado (sem
consulta, sem conta). Um documento abre uma conta só. Quem entra por Google ou GitHub recebe a conta com
`doc_verified: false` no token e confirma o documento antes de usar o painel; o core-service recusa abrir loja
para esse token.

## Consequências
- O CPF é dado pessoal: guardamos só a forma mascarada e um HMAC (`DOCUMENT_HASH_KEY`) para impedir duplicidade.
  A consulta prévia pública aceita apenas CNPJ.
- Em produção, a consulta de CPF exige contrato com a SERPRO; o ambiente de demonstração só conhece os CPFs de teste.
- Contas de lojista criadas antes desta regra precisam confirmar o documento no próximo acesso.
- Detalhes: [Receita Federal](../../integrations/receita-federal.md).
