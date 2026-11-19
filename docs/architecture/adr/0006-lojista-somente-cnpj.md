# 0006. Contas de lojista só com CNPJ

- Situação: aceita quanto ao CPF (nunca aceito); a obrigatoriedade do CNPJ foi substituída pela
  [0007](0007-selo-verificado-syndetis.md)
- Data: 2026-11-17

## Contexto
A [0004](0004-documento-do-lojista-na-receita.md) aceitava CPF (com data de nascimento, pela Consulta CPF da
SERPRO) ou CNPJ. Uma pessoa física sem empresa consegue abrir uma loja com o próprio CPF ou com o de outra pessoa,
e a Consulta CPF não confirma que quem preenche é o titular. Uma empresa ativa deixa um rastro público (razão social,
situação, sócios) que dificulta golpes. A Consulta CPF também exige contrato e cobra cada consulta.

## Decisão
Só um **CNPJ ativo** abre uma conta de lojista. O MEI é um CNPJ e continua aceito. Um CPF é recusado antes de
qualquer consulta, com a mensagem "Contas de lojista usam o CNPJ da loja, não CPF.". O resto da 0004 continua:
situação ATIVA na BrasilAPI, uma conta por documento, falha fechada quando a consulta não responde, e o claim
`doc_verified` para quem entrou com Google ou GitHub.

## Consequências
- O cliente da SERPRO e as variáveis `SERPRO_*` saem do integration-hub, da configuração e da implantação; a
  plataforma deixa de depender de um contrato pago.
- Pessoas sem empresa não vendem na Syndetis; o caminho para elas é abrir um MEI.
- Nenhuma migração é necessária: as colunas da V5 continuam (com `document_type = 'CPF'` só em contas antigas).
  Uma conta confirmada com CPF antes desta decisão passa a ter `doc_verified = false` e confirma um CNPJ no próximo
  acesso.
- Detalhes: [Receita Federal](../../integrations/receita-federal.md).
