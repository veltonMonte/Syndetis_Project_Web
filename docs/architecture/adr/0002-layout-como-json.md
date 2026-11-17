# 0002. A aparência da loja é um JSON, não código

- Situação: aceita
- Data: 2026-11-16 (registro de uma decisão anterior, descrita no AGENTS.md)

## Contexto
Cada lojista personaliza a própria loja na Sessão Maker. Gerar e publicar código por loja exigiria um build e
um deploy por alteração, e abriria espaço para código arbitrário de terceiros.

## Decisão
A Sessão Maker serializa as escolhas (modelo, cores, tipografia, seções, conteúdo) num documento JSON, o
`layout_config`, guardado como `JSONB` no core-service com rascunho e versão publicada. O frontend interpreta
esse JSON com componentes conhecidos. O core-service valida o documento antes de salvar: tipos de seção
permitidos, URLs só http(s), cores em hex ou hsl e, no plano sem edição estrutural, nenhuma chave nova.

## Consequências
- Personalizar não exige deploy, e o que é publicado nunca executa código do lojista.
- Todo campo novo precisa existir em três lugares: o editor (`frontend/src/lib/maker.ts`), a conversão para o
  formato do core (`layout-payload.ts`, `published-layout.ts`) e as regras do `LayoutValidator`.
- Layouts antigos precisam continuar válidos: campos novos são opcionais e têm um padrão.
