# 0003. Posição livre como deslocamento, por dispositivo

- Situação: aceita
- Data: 2026-11-16

## Contexto
Lojistas querem arrastar qualquer elemento do modelo para qualquer lugar. Posições absolutas em pixels
quebram em telas de outra largura, e um layout salvo antes do recurso precisa continuar idêntico.

## Decisão
Cada seção pode ter `position = { desktop?: {x, y}, mobile?: {x, y} }`: um deslocamento a partir do lugar dela no
fluxo, com `x` em % da largura da vitrine e `y` em px. O celular usa a posição do computador até ser movido no
celular. A vitrine escolhe o dispositivo pela própria largura (até 760 px é celular). O estilo por elemento
(largura, altura mínima, cores, borda, cantos, sombra, camada e alinhamento) vai em `style`, com cada valor
limitado na leitura. Seções sem `position` e `style` renderizam exatamente como antes.

## Consequências
- A vitrine nunca ganha rolagem lateral (`overflow-x: clip`), mesmo com elementos deslocados.
- O plano sem edição estrutural não aceita as chaves novas, então arrastar fica disponível só no plano Maker.
- Detalhes do formato: [Posicionamento livre](../../product/maker/posicionamento-livre.md).
