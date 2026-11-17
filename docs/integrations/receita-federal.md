# Receita Federal: CNPJ e o selo "Verificado Syndetis"

Qualquer lojista cria conta e loja e vende. O **CNPJ é opcional**: uma loja cujo dono tem CNPJ ativo confirmado na
Receita Federal mostra o selo **"Verificado Syndetis"** na vitrine e no painel. O MEI é um CNPJ e vale; CPF nunca é
aceito. Decisões: [ADR 0006](../architecture/adr/0006-lojista-somente-cnpj.md) (sem CPF) e
[ADR 0007](../architecture/adr/0007-selo-verificado-syndetis.md) (CNPJ opcional, selo e como ele chega às lojas).

## Fonte

[BrasilAPI](https://brasilapi.com.br/docs), que publica os dados abertos de CNPJ da Receita Federal. Não precisa de
chave nem de contrato.

| Campo | Uso |
|---|---|
| `situacao_cadastral` | ativo quando é 2 (`ATIVA`); suspensa, inapta, baixada ou nula são recusadas |
| `razao_social`, `nome_fantasia` | mostrados ao lojista e guardados na conta |
| `opcao_pelo_mei` + natureza jurídica 213-5 | marca a conta como MEI |

## Para o lojista

- **No cadastro**, o campo "CNPJ da loja (opcional)". Vazio, a conta é criada sem selo. Preenchido, o CNPJ é consultado
  na hora (razão social, situação, MEI) e confirmado de novo no servidor: inválido, inexistente ou inativo é recusado
  com uma mensagem clara, e dá para corrigir ou apagar o campo e seguir.
- **Depois**, no painel: "Cadastre seu CNPJ para ganhar o selo" (ao lado do nome da loja e em Minha conta).
- Um CNPJ pertence a uma conta só. Sem resposta da BrasilAPI, nada é confirmado.
- Um CPF é recusado antes de qualquer consulta: "Contas de lojista usam o CNPJ da loja, não CPF."

## O selo

- Vem só do servidor: `stores.owner_verified` no core-service, exposto como `verified` em
  `GET /api/public/stores/{slug}` e `ownerVerified` em `GET /api/stores/me`. Nada no `layout_config` liga o selo.
- O core-service copia o claim `doc_verified` do token assinado do dono ao criar uma loja e sempre que o dono lista as
  lojas (o painel faz isso ao abrir e depois de confirmar o CNPJ).

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
| `POST /api/auth/register/seller` | público | `document` (CNPJ) opcional |
| `POST /api/auth/me/document` | lojista autenticado | Cadastra o CNPJ e devolve tokens novos |
| `POST /internal/tax-ids/verify` (integration-hub) | auth-service | Fora do gateway |

## Dados

- auth-service, `users` (migração V5): tipo, CNPJ formatado, HMAC do número, razão social, MEI e quando foi
  confirmado. Linhas com `document_type = 'CPF'` vêm de antes do ADR 0006 e não contam como confirmadas.
- core-service, `stores` (migração V12): `owner_verified` e `owner_verified_at`.
