# Marca Syndetis

A marca é a direção **Bloco livre**: três módulos ligados por pontes formam a base, e um quarto módulo saiu do lugar. Os módulos ligados são a *syndesis* (ligação) e os três negócios da plataforma: loja, cardápio e bilheteria. O bloco deslocado é a Sessão Maker, onde cada elemento se move livremente.

## Onde está

| O quê | Arquivo |
| --- | --- |
| Símbolo e assinatura no app | `frontend/src/components/syndetis-logo.tsx` e `syndetis-logo.css` |
| Favicon | `frontend/public/favicon.svg` e `favicon.ico` (16 e 32 px); `syndetis.svg` é o endereço antigo e serve o mesmo ícone |
| Ícone iOS | `frontend/public/apple-touch-icon.png` (180 px) |
| Ícones do manifest | `frontend/public/icons/` e `frontend/public/manifest.webmanifest` |
| Símbolo avulso | `frontend/public/brand/syndetis-symbol.svg` (claro), `-dark.svg`, `-mono.svg`, `syndetis-app-icon.svg` |

Os arquivos estáticos saem de um script só. Depois de mudar a geometria, rode em `frontend/`:

```bash
node scripts/brand/generate-icons.mjs
```

O caminho do símbolo existe em dois lugares (o componente e o script). Mude os dois juntos.

## Construção

O símbolo é desenhado num grid de 48 unidades (u) e ocupa de 4u a 44u.

- **Módulo:** quadrado de 16u, raio 4u, vão de 4u entre módulos.
- **Pontes:** ligações de 8u de largura entre os módulos da base.
- **Bloco livre:** deslocado 4u para cima e 4u para a direita do seu lugar no grid.
- **Assinatura:** o nome em Bricolage Grotesque 800, minúsculo, com espaçamento −0,05em. O símbolo tem 1,11 × o tamanho da fonte, e o espaço entre os dois é 0,33em.

No app, passar o mouse ou focar o link da marca devolve o bloco ao lugar. O bloco é levado até lá como uma peça de verdade: é erguido (inclina e cresce um pouco), viaja em arco e assenta com um leve achatamento, em cerca de 0,8 s; ao sair, faz o caminho de volta, e pode mudar de direção no meio do trajeto. Só `transform` é animado, num elemento HTML separado do SVG da base, para rodar no compositor, sem layout nem pintura a cada quadro. Na barra de navegação do celular, a página atual é esse mesmo bloco, levado de aba em aba. Por decisão de produto (frontend/DESIGN.md, "Movimento da marca"), esse trajeto toca mesmo quando o sistema pede movimento reduzido.

## Cores

As cores seguem os papéis do tema Echo, por isso a marca acompanha os temas claro e escuro sem versões separadas no código.

| Parte | Tema claro | Tema escuro |
| --- | --- | --- |
| Módulos e nome | `--echo-text` · #211f2b | `--echo-text` · #f5f3ff |
| Bloco livre | `--echo-accent` · #6857eb | `--echo-accent-glow` · #7d73ff |
| Fundo do ícone de app | n/a | `--echo-surface` · #08051c |

O bloco livre tem pelo menos 3:1 de contraste contra os fundos do app nos dois temas.

- **Monocromática:** uma cor só para tudo (preto ou branco). O deslocamento do bloco continua visível sem a cor.
- **Sobre o accent:** tudo em branco.
- **Ícone de app e favicon:** fundo escuro #08051c, módulos #f5f3ff e bloco #7d73ff. Funciona nas abas claras e escuras.

## Área de proteção

Deixe livre, em volta da assinatura inteira, uma margem de **¼ da altura do símbolo**. Nada entra nesse espaço: texto, bordas ou outros logos.

## Tamanho mínimo

- **Assinatura (símbolo + nome):** 20 px de altura.
- **Só o símbolo:** 16 px. Abaixo disso, use o ícone de app (com fundo), que foi testado em 16 e 32 px.

## Não faça

- Não gire nem espelhe o símbolo, e não coloque o bloco livre de volta no lugar (ele só encaixa como animação).
- Não troque o bloco livre de cor fora dos papéis acima nem aplique gradiente, sombra ou contorno.
- Não mude a fonte do nome nem escreva com inicial maiúscula na assinatura. Em texto corrido, o nome é "Syndetis".
- Não coloque a assinatura colorida sobre fotos movimentadas. Use a versão monocromática branca.

## Acessibilidade

O símbolo e a assinatura são decorativos (`aria-hidden`). Quem dá o nome é o elemento em volta: o link da marca no header e no rodapé tem `aria-label="Syndetis"`. Para um símbolo sozinho que precise de nome, use `<SyndetisSymbol title="Syndetis" />`.
