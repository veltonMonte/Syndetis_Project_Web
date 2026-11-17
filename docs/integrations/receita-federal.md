# Receita Federal: CPF, CNPJ e MEI

Uma conta de lojista só existe para um CPF ou CNPJ que a Receita Federal confirme como **ativo**. Decisão
registrada no [ADR 0004](../architecture/adr/0004-documento-do-lojista-na-receita.md).

## Fontes

| Documento | Fonte | Pede | Ativo quando |
|---|---|---|---|
| CNPJ | [BrasilAPI](https://brasilapi.com.br/docs) (dados abertos da Receita) | o número | situação cadastral `ATIVA` |
| MEI | BrasilAPI | o CNPJ | `opcao_pelo_mei` e natureza jurídica 213-5 (empresário individual) |
| CPF | [Consulta CPF v3 da SERPRO](https://apicenter.estaleiro.serpro.gov.br/documentacao/consulta-cpf/en/) | CPF e data de nascimento | situação `REGULAR` (código 0) |

Recusas: número inexistente, data de nascimento divergente, titular menor de 18 anos, situação suspensa,
pendente, cancelada, nula, baixada ou inapta.

## No cadastro

- O formulário de cadastro pede **CPF ou CNPJ**. Com 14 dígitos válidos, consulta o CNPJ na hora e mostra
  razão social, nome fantasia, situação e se é MEI.
- Com 11 dígitos, pede a data de nascimento. O CPF só é consultado ao criar a conta: é dado pessoal e cada
  consulta à SERPRO é cobrada.
- O auth-service confere de novo no servidor; sem consulta (serviço fora do ar), a conta não é criada.
- Quem entrou com Google ou GitHub vê "Confirme seu CPF ou CNPJ" antes do Maker e do painel.
- Exceção: contas criadas pelo operador por configuração, como o lojista de homologação
  (`HOMOLOGATION_SELLER_EMAIL`), listadas em `auth.tax-id.exempt-emails`. Nenhuma conta do cadastro público entra
  nessa lista.

## Configurar

| Variável | Serviço | Para quê |
|---|---|---|
| `TAX_ID_INTERNAL_TOKEN` | auth-service e integration-hub | Segredo da consulta interna (mínimo 32 caracteres) |
| `DOCUMENT_HASH_KEY` | auth-service | Chave do HMAC do documento; obrigatória fora do ambiente local e nunca trocada depois |
| `BRASILAPI_URL` | integration-hub | Padrão `https://brasilapi.com.br/api` |
| `SERPRO_CPF_URL` | integration-hub | Demonstração (padrão) ou `https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df/v3` com contrato |
| `SERPRO_ACCESS_TOKEN` | integration-hub | Token fixo (o ambiente de demonstração usa o token publicado pela SERPRO) |
| `SERPRO_CONSUMER_KEY`, `SERPRO_CONSUMER_SECRET` | integration-hub | Chaves do contrato; geram um token por hora |

O ambiente de demonstração da SERPRO só conhece os CPFs de teste da documentação, por exemplo
404.428.201-35 (nascido em 14/11/1970, regular) e 405.321.768-71 (22/03/1982, suspenso). CPFs reais exigem
contrato.

## Endpoints

| Rota | Quem | Observação |
|---|---|---|
| `POST /api/integrations/tax-ids/lookup` | público, limitado no gateway | Só CNPJ |
| `POST /api/auth/register/seller` | público | Exige `document` e, para CPF, `birthDate` (AAAA-MM-DD) |
| `POST /api/auth/me/document` | lojista autenticado | Confirma o documento e devolve tokens novos |
| `POST /internal/tax-ids/verify` (integration-hub) | auth-service | Fora do gateway |

## Dados

O auth-service guarda em `users` (migração `V5__add_merchant_tax_document.sql`): tipo, CNPJ formatado ou CPF
mascarado (`***.428.201-**`), HMAC do número, razão social, MEI e quando foi confirmado. O token dos lojistas
traz `doc_verified`; o core-service recusa abrir loja quando ele é `false`.
