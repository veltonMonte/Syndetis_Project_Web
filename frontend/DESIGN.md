## Direção visual solicitada pelo usuário

A referência atual é o modo liquid-refract do glasscn: https://glasscn-components.vercel.app/ e https://github.com/kostyniuk/glasscn-components. A aparência deve vir da refração da imagem atrás do botão. Não usar halos, preenchimento violeta emissivo, varredura de brilho ou massas coloridas internas. Essa solicitação prevalece sobre a gramática de plástico e iluminação descrita no bloco Echo gerado.

O HardwareButton mantém seus controles e semântica Echo, mas sua superfície é uma lente transparente. LiquidLens gera um mapa geométrico para uma cápsula; um filtro SVG desloca o backdrop na borda curva, deixando o centro plano. O backdrop-filter fica no próprio controle, antes da pintura da borda: aplicá-lo num filho refrata a própria borda e cria contornos duplicados. A curvatura tem um único perfil suave e a mola do ponteiro altera sua intensidade com uma pequena ondulação do fundo. O rótulo permanece nítido sobre a lente. O suporte óptico é usado em navegadores Chromium; outros mecanismos recebem vidro transparente com desfoque leve. Movimento reduzido conserva a lente estática, com opção explícita de ativar a animação na sessão.

A paleta da página continua preto azulado, azul-violeta e lavanda. A textura fornecida pelo usuário está em public/images/liquid-chrome.png. Sua presença atrás de parte das ações permite perceber a refração; ela pertence ao fundo da página, não é uma luz emitida pelo botão. Modelos de loja preservam suas paletas próprias editáveis.

O hover acompanha o cursor com deslocamento curto, pequena elasticidade e ondulação da refração; a posição é medida pela base imóvel para não haver oscilação na borda. Pressionar comprime o controle e soltar devolve a forma. Translação e escala ficam separadas do mecanismo de som/ativação do Echo. Não há camada specular, faixa luminosa nem halo.

Os aparelhos do hero apresentam uma direção editorial própria para a Oliva Studio: coleção no Mac e detalhe do Vaso Raiz no iPhone. A fotografia de cerâmica foi gerada para o protótipo e está em public/images/oliva-ceramics.png. Coleção, produtos e preços são demonstrativos. As telas continuam HTML nativo; somente a moldura do Mac é SVG. A moldura do telefone usa proporções de cantos consistentes em cada tamanho e metal neutro.

<!-- echo-ui:start -->
<!-- written by echo-ui-cli 0.3.2 from seed {"accent":"#6554e8","chassis":"#08051c","paper":"#f5f3ff","finish":0.7,"pills":true,"fontSans":"\"Segoe UI\", system-ui, sans-serif"} -->
# Design

This project's interface is **Echo UI**: tactile React components in `src\components\echo/`, on the grammar in the `echo-ui-core` package. This file is its look in Echo's terms. **In this codebase, build with those components; don't rebuild them from this file.** `npx echo-ui-cli which "<the job>"` names the part for a job, `npx echo-ui-cli docs <name>` shows it.

## Overview

A device, not a skin: molded plastic lit by one key light from the upper left, screens that glow, keys that travel when pressed. The grammar is fixed (the light, what each material is for, state without hue, motion as physics, sound as feedback, WCAG 2.2 AA). The vocabulary below (colour, type, radius, density, finish) comes from this project's seed, and its pale or dark chassis makes this a dark device.

## Colors

| Role | Value | For |
| --- | --- | --- |
| `--echo-surface` | #08051c | The molded chassis base. |
| `--echo-cap` | #262540 | Neutral button-cap plastic. |
| `--echo-cap-highlight` | #3f3e5e | The lit top rim of a bevel. |
| `--echo-cap-shadow` | #020011 | A cap's underside and side wall. |
| `--echo-well` | #000005 | Recesses: the shade a cap sits in. |
| `--echo-accent` | #6857eb | The one saturated colour — emissive marks: LEDs, LCD digits, the lit rail. |
| `--echo-accent-highlight` | #9baaee | Top-lit gloss on an active cap. |
| `--echo-accent-pressed` | #5346bf | The pressed or recording accent. |
| `--echo-accent-glow` | #7d73ff | What's lit: an LED, the current rail. On a light device, 3:1 on every ground. |
| `--echo-accent-ink` | #b0b2ff | What's lit, printed: a readout, a count, a current tab's text, and the focus ring. The glow on a dark device, a step deeper on a light one; AA on every ground. |
| `--echo-primary-cap-top` | #685be6 | Top of the primary cap's gradient. Guaranteed AA against its label, primary-cap-ink. |
| `--echo-primary-cap-mid` | #5e50d3 | Middle of the primary cap's gradient. |
| `--echo-primary-cap-base` | #4b3fae | Base of the primary cap's gradient. |
| `--echo-primary-cap-ink` | #f5f3ff | The label on the primary cap: the text on a dark device, near-white on a light one. |
| `--echo-pour-top` | #685be6 | The liquid a cap or slider fills with, under a label that also sits on the unlit plastic. AA against text. |
| `--echo-pour-mid` | #5e50d3 | Middle of the pour. |
| `--echo-pour-base` | #4b3fae | Base of the pour. |
| `--echo-accent-fill-top` | #abaefa | A bright accent fill that carries dark text. Emitted for your own use; no component paints it. |
| `--echo-accent-fill-base` | #7d73ff | Base of that fill. |
| `--echo-lcd` | #000003 | The screen field: dark glass, or paper glass on a light device. |
| `--echo-lcd-glow` | #7d73ff | Emissive tint on the screen. |
| `--echo-text` | #f5f3ff | Primary text. |
| `--echo-text-dim` | #b1afba | Secondary text. Still AA on every ground it is used on. |
| `--echo-seam` | #000002 | Panel seams and the darkest hairline. |

One saturated colour, with two jobs only: a lit cap (the primary action, the current page) and something emitting light (LEDs, LCD digits, the rail). A state is said in words and shape, never by hue: there's no success green or danger red.

## Typography

- `--echo-font-machine`: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif
- `--echo-font-sans`: "Segoe UI", system-ui, sans-serif
- `--echo-font-mono`: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace
- `--echo-font-lcd`: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace
- Text styles, as `font: var(--echo-type-<style>)`: machine-label, body, body-sm, caption, heading, readout, display.

## Layout

- Spacing, `--echo-space-1` to `--echo-space-12`: 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 64px, at density `default`.
- Control heights: compact 32px, default 44px, large 60px. No target is smaller than 24×24px.
- Breakpoints: 560px, 640px, 900px, 1100px.

## Elevation & Depth

Raised parts catch light on their top edge and cast a shadow below; recessed parts are shaded at the top and lit at the bottom lip. Take a recipe, never a shadow written by hand:

- `--echo-shadow-well`: Set into the body: a field, a tray, the bed a cap sits in.
- `--echo-shadow-well-screen`: The glass of a screen or a readout.
- `--echo-shadow-well-deep`: A deep bezel: a large screen, a keypad's window.
- `--echo-shadow-groove`: A track cut into the body, for progress and levels.
- `--echo-shadow-edge`: Light catching the top edge of a small raised part.
- `--echo-shadow-hairline`: The lit lip under a divider.
- `--echo-shadow-chip`: A small raised part: a badge, a count.
- `--echo-shadow-key`: A low key standing on its seam.
- `--echo-shadow-cap`: A molded cap at rest.
- `--echo-shadow-cap-lit`: The lit cap, the one place the hardware turns accent.
- `--echo-shadow-panel`: A panel resting on the body.
- `--echo-shadow-lifted`: A panel lifted off the body, the way a card rises under the pointer.
- `--echo-shadow-chassis`: The device's own body.
- `--echo-shadow-tooltip`: A tooltip, the lowest thing that floats.
- `--echo-shadow-popover`: A popover or a small popup.
- `--echo-shadow-toast`: An announcement floating over the page.
- `--echo-shadow-modal`: A dialog, the highest thing that floats.
- `--echo-shadow-ring`: Keyboard focus around a raised part: a gap in the body's colour, then the accent's ink (the glow, on a dark device).
- `--echo-shadow-ring-inset`: Keyboard focus inside a well, where a ring outside would sit on the rim.
- `--echo-shadow-glow`: The glow of something lit: the current tab, the page you're on.

## Shapes

- Radius, `--echo-radius-*`: xs 2px, sm 6px, md 9px, lg 12px, xl 14px, 2xl 18px, 3xl 22px, full 999px, at this seed's radius 0.5 (0 crisp, 1 soft). Buttons and segments are pills (`pills`).
- Finish 0.7 (0 matte, 1 glossy): how brightly edges shine and how deep shadows fall.

## Motion

- Durations, `--echo-duration-*`: glitch 80ms, press 90ms, tick 120ms, swap 160ms, glide 190ms, sweep 220ms, pop 400ms, flood 700ms, each with its `--echo-ease-*`.
- Controls acknowledge you quickly; things that arrive and leave take a little longer; glass moves smoothly, pixels move in steps. Anything the hand can redirect moves on a spring. Under reduced motion, movement collapses to a fade or stops.

## Sound

- 9 tokens: tap, press, release, select, transition, notify, caution, error, celebrate. Dry and short, like a device. It confirms what you can see and never carries anything on its own; it starts muted until the person turns it on.

## Components

Installed here: card, checkbox, field, hardware-button, layout, modal, pagination, panel, segmented, select, size, skeleton, table, textarea, toast. `npx echo-ui-cli which` names the rest by job.

## Do's and Don'ts

- Do use Echo's component for every job it has, and build what it lacks from Echo's parts, styled only with `var(--echo-*)`.
- Do keep one primary action per form or dialog, and put anything destructive behind a confirmation that names what happens.
- Do: every control has a name: `label`, `aria-label` or `aria-labelledby` (the types require it).
- Do: a form error goes in words, in the field's `error`; never colour alone.
- Do: announce with `toast()` from `useToast()`, under one `<Toaster>`.
- Do: never remove a focus ring, shrink a target below 24×24px, or put `aria-hidden` on something focusable.
- Don't write a colour, a shadow, a spacing or a duration by hand; don't restyle Echo from outside (a `className` it doesn't take, CSS aimed at `.echo-…`); don't show a state with colour alone.
- Don't mix another component library into an Echo screen. After changing UI, run `npx echo-ui-cli check`.
<!-- echo-ui:end -->


## Product — início do Maker

- Pedido do usuário em 29/10/2026: contas novas começam pela escolha entre criar com IA, criar sozinho e usar template. Nenhum modelo é aplicado automaticamente. No Básico, somente templates são liberados; as permissões vêm da API de assinaturas.
- Referência de composição: tela de escolha de criação do Gamma (https://help.gamma.app/en/articles/7838093-how-do-i-create-a-new-presentation-document-or-webpage-in-gamma) e fluxo de criação do Canva (https://www.canva.com/help/design-from-scratch/). A identidade violeta e os controles Liquid Glass existentes são preservados.
- Notebook e tablet são molduras do conteúdo da loja, solicitadas explicitamente pelo usuário. Aparecem somente na ação Visualizar, um dispositivo por vez. A advertência estática do Echo sobre imports de componentes em components/ui não implica trocar essas molduras por outro componente: esta é uma decisão explícita do produto, restrita à prévia.
- A edição acontece em uma área plana, sem moldura de dispositivo. Rascunhos ficam separados por conta; o catálogo começa vazio em projetos novos. Ao adequar um projeto ao Básico, preserve categorias e produtos, com uma cópia local do layout anterior.
- A geração com IA ainda não tem integração no backend. O fluxo coleta o briefing e informa essa condição; não simula geração nem debita solicitações.

## Product — aparência clara e escura

- Decisão explícita do usuário: oferecer as duas aparências nas configurações e iniciar com branco. O claro é o padrão sem preferência salva, independentemente do esquema do sistema operacional; o escuro preserva o visual anterior.
- A escolha aplica-se à interface da plataforma, incluindo painel e Maker, e fica salva por conta neste navegador. A configuração usa o mesmo componente em todas as telas de ajustes.
- O tema claro é gerado via createEchoTheme a partir da identidade violeta, com chassis branco e texto escuro. Nunca editar os papéis derivados à mão; regenerar com scripts/generate-appearance-theme.mjs. O bloco gerado acima documenta a paleta escura de origem, não o padrão da aplicação.
- Conteúdos de loja e telas de marca em dispositivos usam um escopo próprio de cores. A aparência da plataforma não reescreve o projeto da loja.


## Product — presença do fundo fluido

- Ajuste solicitado pelo usuário: fluido com opacidade de 50% nas telas da plataforma. A máscara mantém a borda suave e, no tema claro, um degradê branco protege as áreas de texto.
- A entrada do Maker, a galeria de modelos e a página Sobre compartilham esse fundo, além das telas que já o utilizavam.
