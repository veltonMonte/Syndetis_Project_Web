<!-- echo-ui:start -->
<!-- written by echo-ui-cli 0.3.2 -->
## Echo UI

This project's UI is built with Echo: tactile React components copied into `src\components\echo/` (see `echo.json`), on the grammar in the `echo-ui-core` package.

- Use Echo's component for every job it has. Never imitate one with raw elements or its classes.
- Before using a component, ask: `npx echo-ui-cli which "<the job>"`, then `npx echo-ui-cli docs <name>`. Add one with `npx echo-ui-cli add <name>`.
- Set up once: import `src\components\echo/echo-theme.css` from the root layout or global CSS, give `body` `background: var(--echo-well); color: var(--echo-text); font-family: var(--echo-font-sans)`, wrap the app in `SoundProvider` from `echo-ui-core/sound`, and put `<EchoCheck />` from `echo-ui-core/check` in the root layout.
- Style only with `var(--echo-*)`. Never write a colour value: the theme sets them all.
- The packages are `echo-ui-cli` and `echo-ui-core`. There is no `echo-ui` or `echoui` package: never install one.
- Accessibility: every control has a name: `label`, `aria-label` or `aria-labelledby` (the types require it).
- Accessibility: a form error goes in words, in the field's `error`; never colour alone.
- Accessibility: announce with `toast()` from `useToast()`, under one `<Toaster>`.
- Accessibility: never remove a focus ring, shrink a target below 24×24px, or put `aria-hidden` on something focusable.
- Building a screen? Read `DESIGN.md` (its look and decisions), then follow `.claude/skills/echo-ui/SKILL.md`. Every choice comes from a decision, Echo's default or the builder: when unsure, ask the builder.
- A look of its own: a moodboard becomes a style with `.claude/skills/echo-design-eye/SKILL.md`, Style Fit picks one with `.claude/skills/echo-style-fit/SKILL.md`; `npx echo-ui-cli style set <setting> <value>` moves one setting.
- After changing UI, run `npx echo-ui-cli check`, then `npx echo-ui-cli test` with the app running, and fix what they find. Only the builder keeps a slop-police finding.
<!-- echo-ui:end -->
