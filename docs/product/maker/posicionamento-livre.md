# Posicionamento livre e novos elementos

No plano Maker, qualquer elemento do modelo pode ser arrastado para qualquer lugar (na vertical, na horizontal ou
na diagonal), e cada um tem controles próprios de aparência. Decisão registrada no
[ADR 0003](../../architecture/adr/0003-posicao-livre-no-layout.md).

## Usar

- **Arrastar:** a alça **Mover** de cada seção, no canvas. Shift trava no eixo dominante; as setas movem 1% ou
  8 px (com Shift, 5×). Cada arraste é um passo de desfazer.
- **Computador e celular:** com a prévia no celular, o arraste vale só para o celular. Sem posição própria, o
  celular usa a do computador.
- **Posição e aparência** (inspetor): posição exata, alinhamento, largura, altura mínima, cores de fundo, texto e
  borda, espessura da borda, cantos, sombra e camada. "Voltar à posição do modelo" e "Limpar aparência" desfazem.

## Elementos

Texto livre, imagem, botão, banner, espaçador, divisor, contagem regressiva e depoimentos, além das seções dos
modelos. Ficam na galeria de blocos, no grupo "Elementos livres" (a contagem regressiva fica em "Conversão").

## Formato no `layout_config`

```json
{
  "id": "demo-countdown",
  "editorType": "countdown",
  "type": "banner",
  "title": "Semana Brisa termina em",
  "targetDate": "2026-11-21T12:00:00.000Z",
  "position": { "desktop": { "x": 18, "y": -24 }, "mobile": { "x": 0, "y": -12 } },
  "style": { "width": 64, "borderRadius": 24, "shadow": "strong", "zIndex": 3, "backgroundColor": "#ffffff", "align": "center" }
}
```

| Campo | Limites |
|---|---|
| `position.*.x` | −100 a 100 (% da largura da vitrine) |
| `position.*.y` | −3000 a 6000 (px) |
| `style.width` | 10 a 100 (%; 100 é omitido) |
| `style.minHeight` | 0 a 1200 (px) |
| `style.borderWidth` / `borderRadius` | 0 a 12 / 0 a 64 (px) |
| `style.zIndex` | 0 a 50 |
| `style.shadow` | `soft` ou `strong` |
| `style.align` | `start`, `center` ou `end` |
| cores | hex `#rrggbb` |
| `items` (depoimentos) | até 6; texto até 600 e autor até 80 caracteres |

Valores fora dos limites são cortados na leitura. Uma seção sem `position` e `style` renderiza exatamente como
antes.

## Código

| Arquivo | Papel |
|---|---|
| `frontend/src/lib/maker-elements.ts` | Limites, limpeza e CSS de posição e estilo |
| `frontend/src/components/maker-free-move.tsx` | Alça de arraste (ponteiro e teclado) |
| `frontend/src/components/maker-element-controls.tsx` | Controles "Posição e aparência" |
| `frontend/src/components/store-elements.tsx` | Renderização dos elementos novos |
| `frontend/e2e/maker-free-position.spec.ts` | Arrastar, salvar, recarregar e conferir na vitrine |
