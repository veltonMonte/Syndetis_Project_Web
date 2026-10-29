---
name: echo-ui
description: Build or change this project's UI with Echo UI — a screen, a component, fixing what `npx echo-ui-cli check` reports, or updating Echo. Use it for any task that touches the interface.
---

# Echo UI in this project

Echo's components live in `src\components\echo/`, copied in by the CLI; its grammar (theme, sound, motion) is the `echo-ui-core` package. Every command below is `npx echo-ui-cli …`, which runs the project's own copy.

## Build a screen

0. Read `DESIGN.md`: this project's colours, type, spacing and depth, in Echo's terms, and its style's decisions. Every choice on the screen (what leads, how the main action looks, the words, the icons, the images) comes from a decision, from Echo's own default, or from the builder: never from your own habits. Where the style decides nothing, ask the builder (below), or use Echo's default and say so.
1. Name the screen's one main action. Everything else on it is quieter than that.
2. Ask which Echo item does each job, all at once: `npx echo-ui-cli which "<job>" "<job>" …`. Where it says nothing in Echo does the job, build that part from Echo's parts, styled only with `var(--echo-*)`.
3. Read the reference screen closest to yours: `npx echo-ui-cli docs console` for dashboards, data and instruments, or `npx echo-ui-cli docs chat` for a conversation. Copy how it composes, not its content.
4. Read what you'll use: `npx echo-ui-cli docs <name> <name> …`. Its imports are written the way this project resolves them.
5. Build it from those components. Lay it out with Layout, Panel and Card; never restyle a component to look like another.
6. Run `npx echo-ui-cli check` and fix everything it reports before saying you're done.
7. With the app running, read the browser console (Next.js 16's dev server prints it in its terminal too): each `Echo check ·` line is something only the rendered page shows. Fix it as below, and the line goes on the next look.
8. Last, run Echo's tests: `npx echo-ui-cli test` loads each page headless, measures what a designer checks (contrast, text cut off, actions out of line, empty columns, glows, stacked shadows, corners, icons) and runs axe's WCAG A and AA rules. Fix each finding the way it says, changing only what it names, and run it again until it passes. When one is in markup you can't change (a library's widget, an embed), tell the builder: never turn its rule off in echo.json, and never work around it. In Claude Code they run by themselves when you stop, and you can't stop until they pass. One page: `npx echo-ui-cli test /pricing`; another address: `--url`.

## Add a component

`npx echo-ui-cli which "<the job>"` names it, `npx echo-ui-cli add <name>` copies it in with what it needs, and `npx echo-ui-cli docs <name>` shows its props and a working use.

## Change the look

One setting, or a few, is `npx echo-ui-cli style set <setting> <value> …`: it checks every value first, writes the theme and `DESIGN.md` again, keeps contrast at AA, and prints the line that puts it back. Run `npx echo-ui-cli style set` alone first to see where each setting is, then move it from there:

- rounder or softer: `radius` up (0 crisp, 1 soft); sharper or crisper: `radius` down;
- pill buttons whatever the corners: `pills true`; buttons that follow the corners: `pills false`;
- glossier or shinier: `finish` up (0 matte, 1 glossy); flatter or more matte: `finish` down;
- denser or tighter: `density compact`; roomier or airier: `density comfortable`;
- another brand colour: `accent` (Echo holds every accent to one lightness, and the output says if it moved);
- a light device or a dark one: `chassis` and `paper` together (a pale chassis makes a light device, with dark text on it);
- another typeface: `fontSans`, `fontMachine`, `fontMono` or `fontLcd`, as a quoted font stack, and load the font in the app;
- back to Echo's own: `<setting> default`.

A whole new look is a style, not a pile of settings: read a moodboard with Design Eye, or pick one with Style Fit, and wear it with `npx echo-ui-cli style use <name>`. Never edit the theme file or the seed by hand, and never restyle a component to get a look.

## Fix what the check reports

Each line is `file:line` and the Echo way to do it. The usual ones:

- a colour written by hand: use the role it names, `var(--echo-…)`;
- spacing, a radius or a timing off Echo's scales: write the token the line gives;
- a shadow drawn by hand: use the shadow recipe it names, `var(--echo-shadow-…)`;
- a restyle from outside (a `className` Echo doesn't take, CSS aimed at `.echo-…`, a theme token set by hand): use the component's props, a Scope for a colour of its own, or the seed;
- a raw `<button>`, `<select>`, `<input>` or `<dialog>`: use the Echo component it names;
- a prop the component doesn't take: the line names the one it has (`variant`, `onCheckedChange`);
- a control without a name: give it the `label` or `aria-label` the line asks for;
- `onClick` on a `div`: use HardwareButton, or Item for a row;
- a field without a label, or an error that's only a colour: name the field, and say the error in words (Field's `error` does both);
- motion outside Echo's: move your own parts with `useTactile`, `createSpring` and the motion tokens, and give every animation a reduced-motion fallback;
- a screen rule: the line quotes the rule by number. Change the screen the way it says (one primary action, a confirm step, a label that names what happens), not the check;
- from the console, `Echo check · contrast`: text too faint for what's behind it. Use the text role made for that ground (`--echo-text`, `--echo-text-dim`), not a colour of your own;
- `Echo check · setup`: the theme, the page's ground or `SoundProvider` is missing. Do what the line says, once, in the root layout.
- `alignment`: text cut off with "…" (let it wrap, or fewer words), cards side by side whose actions sit at different heights (each card fills its cell, its actions last), a lone action off its column's edge (start it where the content starts), a grid that leaves columns empty (let the items share the row);
- `depth`: a control that glows at rest (light says a state in Echo: take it off), or a raised surface on a raised one (set the inner one flat or into a well; never a Card in a Card);
- `corners`: parts of one kind with different corners (give them one), or a corner inside a corner that doesn't follow it (the outer radius less the gap, the number the line gives);
- `icons`: one group's icons at different sizes, stroke weights or styles (one set, one size, one stroke);
- `Slop police, …`: something that reads as AI-made (gradient text, an emoji as an icon, the sparkle for AI, "Get started", an arrow stapled to a label, a headline that could front any product, a stand-in name or photo, a stripe down one edge, spaced capitals made by hand, an `A · B · C` string). Do what the line says. Never add it to the style's `keeps`: only the builder keeps one. A note about a number that may be invented asks you to use the real one or mark it as sample data.

## Asking the builder

When you're not sure, ask. Don't guess, and don't reach for your own default: a default nobody chose is exactly what reads as AI-made. You're not sure when:

- the slop police stops something the board or the builder seems to want;
- no decision in the style covers a choice you're about to make;
- two rules disagree.

Ask in one message, at most three questions, each with the answer you'd suggest first and one line on why. Write the answer where it will be read next time (the style's `keeps` or `decisions`, or the `## Product` section of `DESIGN.md`), so the same question is never asked twice.

**Only the builder keeps a banned pairing.** Never add to `keeps` on your own. If no one is there to answer (a run with nobody watching), take your suggested answer, say so in your last message, and where the police is involved, change the ingredient instead of keeping it.

## Update Echo

`npx echo-ui-cli diff` says which items are behind, and `npx echo-ui-cli update` brings them forward, merging Echo's change into files you've edited. Where your edits and Echo's change meet in the same lines, it leaves that item as it is and prints the lines between git's conflict markers: bring Echo's change into those lines of the file, keeping what's yours, then run `npx echo-ui-cli update <name>` again. Never re-run `add --overwrite` to upgrade; it discards edits without showing them.
