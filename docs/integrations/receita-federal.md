# Receita Federal: CNPJ e MEI

Só lojas com **CNPJ ativo** na Receita Federal vendem na Syndetis. É uma barreira contra golpes: uma empresa ativa
deixa um rastro público que uma pessoa física não deixa. O MEI é um CNPJ e é aceito; CPF não é. Decisões
registradas no [ADR 0004](../architecture/adr/0004-documento-do-lojista-na-receita.md) e no
[ADR 0006](../architecture/adr/0006-lojista-somente-cnpj.md).

## Fonte

[BrasilAPI](https://brasilapi.com.br/docs), que publica os dados abertos de CNPJ da Receita Federal. Não precisa de
chave nem de contrato.

| Campo | Uso |
|---|---|
| `situacao_cadastral` | ativo quando é 2 (`ATIVA`); suspensa, inapta, baixada ou nula são recusadas |
| `razao_social`, `nome_fantasia` | mostrados no cadastro e guardados na conta |
| `opcao_pelo_mei` + natureza jurídica 213-5 | marca a conta como MEI |

## No cadastro

- O formulário pede o **CNPJ da loja**. Com 14 dígitos válidos, consulta na hora e mostra razão social, nome
  fantasia, situação e se é MEI.
- Um CPF (11 dígitos) é recusado no navegador e no servidor, sem consulta: "Contas de lojista usam o CNPJ da loja,
  não CPF."
- O auth-service confere de novo no servidor; sem consulta (serviço fora do ar), a conta não é criada.
- Um CNPJ abre uma conta só.
- Quem entrou com Google ou GitHub vê "Confirme o CNPJ da sua loja" antes do Maker e do painel. Contas confirmadas
  com CPF antes do ADR 0006 também.
- Exceção: contas criadas pelo operador por configuração, como o lojista de homologação
  (`HOMOLOGATION_SELLER_EMAIL`), listadas em `auth.tax-id.exempt-emails`. Nenhuma conta do cadastro público entra
  nessa lista.

## Configurar

| Variável | Serviço | Para quê |
|---|---|---|
| `TAX_ID_INTERNAL_TOKEN` | auth-service e integration-hub | Segredo da consulta interna (mínimo 32 caracteres) |
| `DOCUMENT_HASH_KEY` | auth-service | Chave do HMAC do CNPJ; obrigatória fora do ambiente local e nunca trocada depois |
| `BRASILAPI_URL` | integration-hub | Padrão `https://brasilapi.com.br/api` |

## Endpoints

| Rota | Quem | Observação |
|---|---|---|
| `POST /api/integrations/tax-ids/lookup` | público, limitado no gateway | Recusa CPF |
| `POST /api/auth/register/seller` | público | Exige `document` (CNPJ) |
| `POST /api/auth/me/document` | lojista autenticado | Confirma o CNPJ e devolve tokens novos |
| `POST /internal/tax-ids/verify` (integration-hub) | auth-service | Fora do gateway |

## Dados

O auth-service guarda em `users` (migração `V5__add_merchant_tax_document.sql`): tipo, CNPJ formatado, HMAC do
número, razão social, MEI e quando foi confirmado. O token dos lojistas traz `doc_verified`; o core-service recusa
abrir loja quando ele é `false`. Linhas com `document_type = 'CPF'` vêm de antes do ADR 0006 e não contam como
confirmadas.
