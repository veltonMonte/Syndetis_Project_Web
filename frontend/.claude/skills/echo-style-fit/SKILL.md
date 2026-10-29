---
name: echo-style-fit
description: Pick the visual style this product wears with Echo UI, from the builder's own style library (~/Documents/styles) and Echo's. Profiles the product on the seven temperament axes the styles are placed on, has the CLI order every candidate against that profile, reads the best of them, and returns an opinionated pick with the argument for it, the runner-up, what to adapt and what to refuse; then wears it. Use when the builder asks which style fits, how the product should look, to pick a design direction, or whether a style suits the product.
---

# Style Fit, for Echo

Choose the style this product wears, and make the choice arguable. The deliverable is a decision someone could disagree with, not a ranking and not a summary of the options. Echo's grammar stays whatever you pick (the light, what each material is for, state in words, motion as physics, AA); a style changes the vocabulary: colours, type, radius, finish, density, and the rules the agent builds screens by.

**Candidates come from the libraries, not from the builder.** The builder's own styles are in their library, written there by Echo's Design Eye; Echo's are published with the registry. Never ask for documents to be uploaded or pasted.

- `npx echo-ui-cli style list --json` lists every style from both, with its essence, whether it makes a light or a dark device, and where its foundation is.
- `npx echo-ui-cli style show <name>` shows one: its fingerprint, settings, rules, refusals, fonts, and the path of its foundation document.
- The library's `INDEX.md` has each of the builder's styles with its fingerprint and what it serves.

Consider every style unless the builder names some. A style read months ago is still a candidate; the point of a library is that it accumulates.

## The mechanism

The reason this isn't taste: **profile the product on the same axes before looking at any candidate.** Score the product first, then measure distance. The other order, reading the styles and then rationalizing a favourite, produces confident nonsense, and you'll feel the pull, because one option is usually prettier.

1. Build the product's profile.
2. Order the candidates against it, and read the best of them.
3. Argue against the winner.
4. Write the decision, and wear the style.

## Step 1: the brief, then the profile

Read what the project already says about itself: a `## Product` section in `DESIGN.md` (Echo's Design Eye writes one there), the README, the `package.json` description, the landing copy, the screens already built. You need: who it's for and their age range; what they come to do; where they use it (a phone, a desk, both); what it competes against; what it must never feel like. Ask the builder only what's missing and would change the answer, in one message of at most three short questions. Write the answers into the `## Product` section, above Echo's marked block (Echo keeps anything outside its markers).

**An earlier decision for the same product** (in the library's `decisions/`, and its Decisions table) is evidence, not a rule. Read it: it may know things the brief doesn't (what the screens carry, what the product claims). But a product and its direction change, and a constraint written for another style can quietly shape this one ("the chrome must be darker than the artwork" was a dark style's answer to a need a light style meets another way). So carry each of its constraints as a question, never straight into HARD CONSTRAINTS: say what it was protecting, ask whether it still holds, and suggest the answer. When it does, write it as the need ("the sheet must stand off its surround"), not as the one style's fix for it ("a darker frame"). Name a new decision for the same product with its date (`<product>-direction-<yyyy-mm-dd>.md`), and say in it what it changes from the earlier one.

Then place the product on the seven axes, as a **target with a tolerance**: the position it wants, and how far a style may drift from it. Some axes are locked (a medical records tool can't be playful: tolerance 0); others are open (era is often free: tolerance 2). A style that misses a locked axis is out; one that misses an open axis by two costs nothing. Place it with the same anchors Design Eye places a style with:

| Axis | 1 ←→ 5 | A 1 looks like | A 3 | A 5 |
| --- | --- | --- | --- | --- |
| Warmth | clinical ←→ human | cool neutrals and hard geometry, no trace of a hand: lab equipment, a terminal | neutral, with one human touch: a warm accent, a rounded corner, a photograph kept in its place | a warm palette, marks made by hand, people in the pictures: paper grain, brush, faces |
| Volume | whisper ←→ shout | near-monochrome, small type, most of the page is air | one confident accent and a clear hierarchy | saturated fields, type the size of the screen, colour everywhere |
| Density | sparse ←→ dense | one idea a screen, wide margins | cards with room between them, a few controls at a time | tables, many controls at once, a console for an eight-hour day |
| Formality | playful ←→ severe | jokes, stickers, bounce, shapes that don't line up | friendly, and orderly | a strict grid, an institution's voice, no play |
| Era | heritage ←→ futuristic | serifs, print craft, ledgers and archives | timeless modern: a clean grotesque, nothing dated | glass, light and gradients: the future as a surface |
| Craft | raw ←→ engineered | rough, handmade, unaligned: a zine | tidy, with a hand still showing | precision everywhere: every value on a scale, nothing approximate |
| Ornament | austere ←→ decorative | nothing that isn't needed | one signature flourish | pattern, illustration and decoration throughout |

```
| AXIS | 1 ←→ 5 | TARGET | TOLERANCE | WHY |
| Warmth      | clinical ←→ human      | n | n | ... |
| Volume      | whisper ←→ shout       | n | n | ... |
| Density     | sparse ←→ dense        | n | n | ... |
| Formality   | playful ←→ severe      | n | n | ... |
| Era         | heritage ←→ futuristic | n | n | ... |
| Craft       | raw ←→ engineered      | n | n | ... |
| Ornament    | austere ←→ decorative  | n | n | ... |
```

Then three things the axes can't hold:

- **MUST SIGNAL**: what a stranger has to feel in two seconds, or the product has failed.
- **MUST NEVER SIGNAL**: the read that would be fatal. Usually the sharpest instrument in the document.
- **HARD CONSTRAINTS**: what the screens must carry (dense tables, user photography, long text, many languages), and what the team can really build and keep up. Each one is a need, said so any style can meet it, never one style's way of meeting it.

## Step 2: order the candidates, then read them

`npx echo-ui-cli style fit --profile "W4 V2 D1 F2 E3 C3 O3" --tolerance "W1 V1 D1 F0 E2 C1 O1"` measures every style against the profile: each axis's distance, how far past its tolerance the style lands, and which locked axes it misses. It orders them; it doesn't decide. Take the first three to five that miss no locked axis, and read each one's foundation in full (`npx echo-ui-cli style show <name>` gives the path): its PART III fit profile, its rules and its refusals.

For each, check what the axes don't cover:

- **SERVES**: is this product in the territory the style is built for, or next to it?
- **STRAINS**: does the product's content live exactly where the style breaks? A style that can't carry dense data is out for a data product, however well it scores.
- **COSTS**: can this team build it and keep it up? A style that needs a house illustration process is a hiring decision, not a design decision.
- **MUST NEVER SIGNAL**: does the style trip the fatal read? That's a veto, not a deduction.
- **The device**: a pale style makes Echo's light device (light plastic, screens of paper glass), a dark one the dark device (lit screens). Say which the product gets, and why it suits where it's used.
- **The slop police**: the list marks a style whose own ingredients make a pairing the police bans (a cream ground with a terracotta accent, indigo on white in a stock sans…). It stays on the list, and it can still win, but only if the builder keeps what the police bans. If it's your pick, ask them before you wear it.
- **Its decisions**: how many of the style's decisions it makes (`style show` lists them). A style that decides little leaves every screen to ask; say so when it's close.

State the order the CLI gave, then say plainly which factor drove the call: usually one or two things, not the sum.

## Step 3: argue against the winner

Before writing, argue against your own pick. Where does it fail this product? What breaks first? What will the team be tempted to add that would ruin it? Put what you find in the document: the risks are what the builder returns to in three months.

- **The hybrid trap.** The surface of one style on the structure of another usually reads as neither. When the two foundations list each other under ADJACENT, a blend is available; when they don't, say so and make the builder choose.
- **The prettiest-option pull.** The most beautiful foundation is often the worst fit. If the losing candidate is the better artefact, say it out loud.

## Step 4: the decision, then wear it

```
# <Product> × <Style>: direction

THE CALL: the pick and the one-sentence reason, first line.
THE PRODUCT: the axis table, must signal, must never signal, hard constraints.
THE ORDER: what style fit gave, then one short reading per candidate you read:
  distances, vetoes, the verdict in a sentence. Losing candidates get a real reading.
WHY THIS ONE: the argument, citing the foundation's own rules by name.
WHAT TO ADAPT: amendments to the style's rules for this product: which rule, what it
  becomes, why. Few; a style that needs five amendments is the wrong style.
WHAT NOT TO TAKE: the parts that don't survive this product, and what to do instead.
THE RISKS: what breaks first, what the team will be tempted to add, the early warning.
THE RUNNER-UP: what it was better at, and the condition that flips the call.
```

Write it as a designer arguing a position to a founder who'll push back: declarative, specific, no hedging. Cite the evidence: sampled colours, named materials, the foundation's constraints.

1. Save it to the builder's library, `~/Documents/styles/decisions/<product>-direction.md` (or `$ECHO_STYLES_DIR/decisions/`; `npx echo-ui-cli style list` prints the library's path), and add a row to the Decisions table in its `INDEX.md`: product, pick, date, link. Start the table if there isn't one.
2. Wear it: `npx echo-ui-cli style use <name>` writes its settings to the project and its rules and decisions to `DESIGN.md`. Do it when the builder asked you to choose, or says yes to the pick. It refuses a style the slop police stops: ask the builder (below), and if they keep it, add their reason to the style's `keeps` in the library; if not, pick the runner-up. A pick that's only its document (`npx echo-ui-cli style fit` and `npx echo-ui-cli style show` say so) needs its Echo part first: write it the way Echo's Design Eye does ("A foundation without its Echo part", in its skill), then wear it.
3. Put WHAT TO ADAPT and WHAT NOT TO TAKE into the `## Product` section of `DESIGN.md`, under "Style amendments", so every agent building a screen keeps to them, including any decision this product changes ("the main action: the blue cap, and never on a photo"). The style stays as it is in the library: it's reused across products, and the amendments are this product's.
4. In chat: the call, the one-sentence reason, and the single biggest risk. Point to the decision document for the rest.

## Asking the builder

When you're not sure, ask. Don't guess, and don't reach for your own default: a default nobody chose is exactly what reads as AI-made. You're not sure when:

- the slop police stops something the board or the builder seems to want;
- no decision in the style covers a choice you're about to make;
- two rules disagree.

Ask in one message, at most three questions, each with the answer you'd suggest first and one line on why. Write the answer where it will be read next time (the style's `keeps` or `decisions`, or the `## Product` section of `DESIGN.md`), so the same question is never asked twice.

**Only the builder keeps a banned pairing.** Never add to `keeps` on your own. If no one is there to answer (a run with nobody watching), take your suggested answer, say so in your last message, and where the police is involved, change the ingredient instead of keeping it.

## When nothing fits

Say so. Candidates that all miss a locked axis mean the libraries were collected for other products: a useful finding, and the builder needs it more than a forced winner. Describe the style the profile is asking for, precisely enough to go and collect references for it, then read them with Echo's Design Eye. Until then, the product can wear Echo's own style (`npx echo-ui-cli style use echo`) or keep its seed.
