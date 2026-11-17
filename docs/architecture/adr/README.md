# Registro de decisões de arquitetura (ADR)

Cada arquivo registra uma decisão que muda como o sistema é construído: o contexto, o que foi decidido e o que
isso custa. Um ADR aceito não é reescrito; quando a decisão muda, um ADR novo o substitui e diz qual.

| Nº | Decisão | Situação |
|---|---|---|
| [0001](0001-jwt-validado-localmente.md) | JWT RS256 validado localmente com JWKS | Aceita |
| [0002](0002-layout-como-json.md) | A aparência da loja é um JSON (`layout_config`), não código | Aceita |
| [0003](0003-posicao-livre-no-layout.md) | Posição livre guardada como deslocamento, por dispositivo | Aceita |
| [0004](0004-documento-do-lojista-na-receita.md) | Conta de lojista só com documento ativo na Receita Federal | Substituída pela 0006 e pela 0007 |
| [0005](0005-mercado-pago-por-oauth.md) | Cada loja recebe na própria conta do Mercado Pago, conectada por OAuth | Aceita |
| [0006](0006-lojista-somente-cnpj.md) | Contas de lojista só com CNPJ, sem CPF | Aceita quanto ao CPF; obrigatoriedade substituída pela 0007 |
| [0007](0007-selo-verificado-syndetis.md) | CNPJ opcional e selo "Verificado Syndetis" propagado pelo token | Aceita |

## Modelo

```markdown
# NNNN. Título curto no imperativo

- Situação: proposta | aceita | substituída por NNNN
- Data: AAAA-MM-DD

## Contexto
O problema e as forças em jogo.

## Decisão
O que fazemos.

## Consequências
O que fica melhor, o que fica pior e o que passa a ser exigido.
```
