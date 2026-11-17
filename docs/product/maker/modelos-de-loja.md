# Modelos de loja

São 12 modelos em três coleções. As cores, fontes e textos de cada um são só o ponto de partida: o lojista
troca tudo no Maker. O que muda de um modelo para outro é a composição.

## Coleção original e premium

Cada modelo responde a um tipo de loja e concentra a ousadia num ponto só.

| Modelo | Tipo de loja | O que o distingue |
|---|---|---|
| Linha | Editorial, galeria | Foto larga como capa de revista, título grande embaixo; produtos em 3 colunas com preço na linha do nome |
| Forma | Marca orgânica, ateliê | Arcos: na foto de abertura e no topo de cada produto; categorias em pílulas |
| Essencial | Loja de tecnologia | Abertura em blocos (bento); produtos sobre fundo de estúdio, com preço em destaque |
| Presença | Moda de luxo | Abertura dividida (texto e foto); o primeiro produto ocupa o espaço de quatro |
| Impacto | Streetwear, lançamento | Tipografia de cartaz, grade com linhas fortes, preço impresso como etiqueta |
| Horizonte | Casa e bem-estar | Cabeçalho flutuante em pílula, seções em folhas arredondadas, produtos sobre fundo suave |

## Coleção Movimento

Pulso, Âmbar, Aurora, Prisma, Vetor e Éon têm abertura animada e composição própria (campanha, editorial,
mosaico, produto técnico, catálogo e vitrine escura). As artes estão descritas em
[Artes dos modelos Movimento](motion-template-assets.md).

## Onde mudar

| Arquivo | O que define |
|---|---|
| `frontend/src/lib/maker.ts` (`templates`) | Nome, cores, fontes, raio e seções iniciais de cada modelo |
| `frontend/src/lib/store-templates.ts` | Textos iniciais de cada seção por modelo |
| `frontend/src/components/store-templates.css` | Base comum a todos os modelos |
| `frontend/src/components/store-template-identities.css` | A identidade de cada modelo clássico, desktop e celular |
| `frontend/src/components/motion-storefront.tsx` | Aberturas da coleção Movimento |

Regras: estilos só com `var(--echo-*)` e as variáveis `--shop-*` da prévia, sem cores escritas à mão; seletores
sempre por `[data-store-template='…']`; todo modelo precisa funcionar vazio (como a galeria mostra) e com
produtos, de 390 px de largura para cima, sem rolagem lateral.
